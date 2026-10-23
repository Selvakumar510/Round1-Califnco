import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { DealerApplication } from '../DemoState';
import { UserProfile, login, logout, registerCustomer, submitDealerApplication } from '../firebaseData';

const ink = '#12334B';

export function AccountScreen({
  enabled,
  userEmail,
  profile,
  pendingDealer,
  loading,
  onDemoRole,
  onNotice,
}: {
  enabled: boolean;
  userEmail: string | null;
  profile: UserProfile | null;
  pendingDealer: DealerApplication | null;
  loading: boolean;
  onDemoRole: () => void;
  onNotice: (message: string) => void;
}) {
  const [mode, setMode] = useState<'Sign in' | 'Create account'>('Sign in');
  const [requestedRole, setRequestedRole] = useState<'Customer' | 'Dealer'>('Customer');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onNotice(success);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Please try again.';
      setError(friendlyAuthError(message));
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return (
      <View>
        <Text style={accountStyles.eyebrow}>YOUR AQUAPURE SPACE</Text>
        <Text style={accountStyles.title}>Choose a preview.</Text>
        <Text style={accountStyles.description}>Authentication is not configured yet. Demo roles let you review each experience; they are not real accounts.</Text>
        <Pressable style={accountStyles.primaryButton} onPress={onDemoRole}><Text style={accountStyles.primaryText}>Switch demo role  →</Text></Pressable>
        <View style={accountStyles.notice}><Text style={accountStyles.noticeTitle}>Ready for Firebase</Text><Text style={accountStyles.noticeText}>Add the Firebase client settings listed in the setup guide, then restart the app to enable sign-in and shared data.</Text></View>
      </View>
    );
  }

  if (loading) return <View style={accountStyles.panel}><Text style={accountStyles.description}>Checking your account…</Text></View>;

  if (userEmail) {
    return (
      <View>
        <Text style={accountStyles.eyebrow}>YOUR AQUAPURE SPACE</Text>
        <Text style={accountStyles.title}>Your account.</Text>
        <View style={accountStyles.panel}>
          <Text style={accountStyles.panelTitle}>{profile?.displayName || 'AquaPure customer'}</Text>
          <Text style={accountStyles.description}>{userEmail}</Text>
          <Text style={accountStyles.roleBadge}>{profile?.role ?? 'Customer'} account</Text>
          {!profile && <Text style={accountStyles.warning}>Your account profile is missing. Contact the administrator before placing an order.</Text>}
          {profile?.role === 'Dealer' && <Text style={accountStyles.description}>Dealer wholesale pricing is active for this approved account.</Text>}
          {profile?.role !== 'Dealer' && profile?.role !== 'Admin' && (
            <DealerApplicationForm
              initialBusiness={pendingDealer?.name ?? ''}
              initialCity={pendingDealer?.city ?? ''}
              status={pendingDealer?.status}
              busy={busy}
              onSubmit={(business, dealerCity) => {
                if (profile) {
                  void run(
                    () => submitDealerApplication(profile.uid, business, dealerCity),
                    'Dealer application submitted for review',
                  );
                }
              }}
              onValues={(business, dealerCity) => { setBusinessName(business); setCity(dealerCity); }}
              businessName={businessName || pendingDealer?.name || ''}
              city={city || pendingDealer?.city || ''}
            />
          )}
          <Pressable style={accountStyles.secondaryButton} disabled={busy} onPress={() => run(logout, 'Signed out')}><Text style={accountStyles.secondaryText}>Sign out</Text></Pressable>
        </View>
        {error !== '' && <Text style={accountStyles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View>
      <Text style={accountStyles.eyebrow}>WELCOME TO AQUAPURE</Text>
      <Text style={accountStyles.title}>{mode === 'Sign in' ? 'Good to see you.' : 'Make yourself at home.'}</Text>
      <Text style={accountStyles.description}>Sign in to place orders, keep track of deliveries, and book service visits.</Text>
      <View style={accountStyles.panel}>
        <View style={accountStyles.segment}>
          {(['Sign in', 'Create account'] as const).map((tab) => (
            <Pressable key={tab} onPress={() => { setMode(tab); setError(''); }} style={[accountStyles.segmentButton, mode === tab && accountStyles.segmentActive]}>
              <Text style={[accountStyles.segmentText, mode === tab && accountStyles.segmentTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={accountStyles.fieldLabel}>ACCOUNT TYPE</Text>
        <View style={accountStyles.segment}>
          {(['Customer', 'Dealer'] as const).map((accountType) => (
            <Pressable key={accountType} onPress={() => setRequestedRole(accountType)} style={[accountStyles.segmentButton, requestedRole === accountType && accountStyles.segmentActive]}>
              <Text style={[accountStyles.segmentText, requestedRole === accountType && accountStyles.segmentTextActive]}>{accountType}</Text>
            </Pressable>
          ))}
        </View>
        {mode === 'Create account' && <Field label="YOUR NAME" value={name} onChange={setName} placeholder="Full name" />}
        <Field label="EMAIL ADDRESS" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="PASSWORD" value={password} onChange={setPassword} placeholder="At least 6 characters" secureTextEntry />
        {mode === 'Create account' && requestedRole === 'Dealer' && (
          <Text style={accountStyles.helper}>Create a customer account first, then submit your business details for admin approval. Dealer pricing starts after approval.</Text>
        )}
        {error !== '' && <Text style={accountStyles.error}>{error}</Text>}
        <Pressable
          style={[accountStyles.primaryButton, busy && accountStyles.disabled]}
          disabled={busy}
          onPress={() => run(
            async () => {
              if (mode === 'Create account') {
                if (!name.trim()) throw new Error('Enter your name to create an account.');
                await registerCustomer(name, email, password);
                return;
              }
              const role = await login(email, password);
              if (requestedRole === 'Dealer' && role !== 'Dealer') {
                throw new Error('This account does not have approved dealer access yet.');
              }
            },
            mode === 'Sign in' ? 'Signed in' : 'Account created',
          )}
        >
          <Text style={accountStyles.primaryText}>{busy ? 'Please wait…' : mode === 'Sign in' ? 'Sign in securely  →' : 'Create account  →'}</Text>
        </Pressable>
        {requestedRole === 'Dealer' && mode === 'Sign in' && <Text style={accountStyles.helper}>Dealer access is available only to accounts approved by AquaPure.</Text>}
      </View>
    </View>
  );
}

function DealerApplicationForm({
  initialBusiness,
  initialCity,
  status,
  busy,
  onSubmit,
  onValues,
  businessName,
  city,
}: {
  initialBusiness: string;
  initialCity: string;
  status?: DealerApplication['status'];
  busy: boolean;
  onSubmit: (business: string, city: string) => void;
  onValues: (business: string, city: string) => void;
  businessName: string;
  city: string;
}) {
  if (status === 'Pending') return <Text style={accountStyles.warning}>Dealer application pending review for {initialBusiness}.</Text>;
  if (status === 'Rejected') return <Text style={accountStyles.warning}>Your previous dealer application was not approved. Contact support if you have questions.</Text>;
  return (
    <View style={accountStyles.dealerForm}>
      <Text style={accountStyles.panelTitle}>Apply for dealer access</Text>
      <Text style={accountStyles.description}>We’ll review your business details before enabling wholesale prices.</Text>
      <Field label="BUSINESS NAME" value={businessName} onChange={(value) => onValues(value, city)} placeholder="Registered business name" />
      <Field label="CITY" value={city} onChange={(value) => onValues(businessName, value)} placeholder="City, state" />
      <Pressable disabled={busy || !businessName.trim() || !city.trim()} style={[accountStyles.secondaryButton, (busy || !businessName.trim() || !city.trim()) && accountStyles.disabled]} onPress={() => onSubmit(businessName, city)}>
        <Text style={accountStyles.secondaryText}>Submit dealer application</Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address';
}) {
  return (
    <View style={accountStyles.field}>
      <Text style={accountStyles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#91A0AA" secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={keyboardType ? 'none' : 'words'} autoCorrect={false} style={accountStyles.input} />
    </View>
  );
}

function friendlyAuthError(message: string) {
  if (message.includes('auth/invalid-credential')) return 'That email and password combination was not recognized.';
  if (message.includes('auth/email-already-in-use')) return 'An account already uses this email. Try signing in instead.';
  if (message.includes('auth/weak-password')) return 'Choose a password with at least 6 characters.';
  if (message.includes('auth/invalid-email')) return 'Enter a valid email address.';
  if (message.includes('permission-denied')) return 'This account does not have permission for that action.';
  return message;
}

const accountStyles = {
  eyebrow: { color: '#76908F', fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.65, marginTop: 35, marginBottom: 9 },
  title: { color: ink, fontSize: 32, fontWeight: '700' as const, letterSpacing: -1 },
  description: { color: '#758695', fontSize: 12, lineHeight: 19, marginTop: 7 },
  panel: { maxWidth: 520, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EFEE', borderRadius: 17, padding: 22, marginTop: 22 },
  panelTitle: { color: ink, fontSize: 16, fontWeight: '700' as const },
  roleBadge: { alignSelf: 'flex-start' as const, backgroundColor: '#EEF6F4', color: '#377B70', fontSize: 10, fontWeight: '700' as const, overflow: 'hidden' as const, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 12 },
  segment: { flexDirection: 'row' as const, gap: 7, backgroundColor: '#F4F7F6', borderRadius: 10, padding: 4, marginBottom: 13 },
  segmentButton: { flex: 1, alignItems: 'center' as const, paddingVertical: 10, borderRadius: 8 },
  segmentActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: '#71838A', fontSize: 11, fontWeight: '600' as const },
  segmentTextActive: { color: ink, fontWeight: '700' as const },
  field: { marginTop: 11 },
  fieldLabel: { color: '#71858C', fontSize: 9, fontWeight: '800' as const, letterSpacing: 1, marginTop: 10, marginBottom: 7 },
  input: { minHeight: 43, borderWidth: 1, borderColor: '#E4EAEA', borderRadius: 9, paddingHorizontal: 12, color: ink, fontSize: 12 },
  primaryButton: { alignSelf: 'flex-start' as const, minHeight: 45, backgroundColor: ink, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 18, borderRadius: 11, marginTop: 17 },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' as const },
  secondaryButton: { alignSelf: 'flex-start' as const, borderWidth: 1, borderColor: '#DDE7E5', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9, marginTop: 16 },
  secondaryText: { color: ink, fontSize: 10, fontWeight: '700' as const },
  helper: { color: '#74878E', fontSize: 10, lineHeight: 16, marginTop: 10 },
  error: { color: '#A94442', fontSize: 10, marginTop: 10 },
  warning: { color: '#896D35', fontSize: 11, lineHeight: 18, marginTop: 12 },
  notice: { maxWidth: 520, backgroundColor: '#F2F6F7', borderRadius: 13, padding: 15, marginTop: 18 },
  noticeTitle: { color: ink, fontSize: 11, fontWeight: '700' as const },
  noticeText: { color: '#758695', fontSize: 10, lineHeight: 16, marginTop: 5 },
  dealerForm: { borderTopWidth: 1, borderTopColor: '#EDF1F0', marginTop: 17, paddingTop: 17 },
  disabled: { opacity: 0.55 },
};
