import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { DealerApplication, Order, Role, ServiceRequest } from './DemoState';
import { getFirebaseDb } from './firebaseApp';
import { firebaseAuth } from './firebaseAuth';

function requireAuth() {
  if (!firebaseAuth) throw new Error('Firebase is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to your environment.');
  return firebaseAuth;
}

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  businessName?: string;
  city?: string;
  dealerStatus?: DealerApplication['status'];
};

export type OrderInput = {
  total: number;
  items: number;
  phone: string;
  lines: { productId: string; name: string; quantity: number; unitPrice: number }[];
  address: string;
  paymentMethod: 'UPI' | 'Cash on delivery';
};

export type ServiceInput = {
  service: string;
  date: string;
  address: string;
};

export const subscribeToAuth = (callback: (user: User | null) => void) =>
  firebaseAuth ? onAuthStateChanged(firebaseAuth, callback) : () => undefined;

export async function registerCustomer(displayName: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  await setDoc(doc(getFirebaseDb(), 'users', credential.user.uid), {
    uid: credential.user.uid,
    displayName: displayName.trim(),
    email: credential.user.email ?? email.trim(),
    role: 'Customer',
    createdAt: serverTimestamp(),
  });
}

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  const userSnapshot = await getDoc(doc(getFirebaseDb(), 'users', credential.user.uid));
  if (!userSnapshot.exists()) throw new Error('This account has no AquaPure profile. Contact support before continuing.');
  const role = userSnapshot.data().role;
  if (role !== 'Customer' && role !== 'Dealer' && role !== 'Admin') {
    throw new Error('This account has an invalid access role. Contact the administrator.');
  }
  return role;
}

export async function logout() {
  await signOut(requireAuth());
}

export function subscribeToProfile(uid: string, callback: (profile: UserProfile | null) => void, onError: (error: Error) => void) {
  return onSnapshot(
    doc(getFirebaseDb(), 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const data = snapshot.data();
      if (data.role !== 'Customer' && data.role !== 'Dealer' && data.role !== 'Admin') {
        onError(new Error('Your Firebase profile has an invalid role.'));
        return;
      }
      if (typeof data.displayName !== 'string' || typeof data.email !== 'string') {
        onError(new Error('Your Firebase profile is missing a name or email.'));
        return;
      }
      callback({
        uid: snapshot.id,
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        businessName: typeof data.businessName === 'string' ? data.businessName : undefined,
        city: typeof data.city === 'string' ? data.city : undefined,
      });
    },
    onError,
  );
}

export function subscribeToOrders(uid: string, role: Role, callback: (orders: Order[]) => void, onError: (error: Error) => void) {
  const ordersRef = collection(getFirebaseDb(), 'orders');
  const ordersQuery = role === 'Admin'
    ? query(ordersRef, orderBy('createdAt', 'desc'))
    : query(ordersRef, where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    ordersQuery,
    (snapshot) => callback(snapshot.docs.map((item) => {
      const data = item.data();
      const date = data.createdAt?.toDate?.();
      return {
        id: item.id,
        customer: data.customerName,
        date: date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now',
        total: data.total,
        status: data.status,
        items: data.items,
      } satisfies Order;
    })),
    onError,
  );
}

export async function createOrder(uid: string, customerName: string, role: Role, input: OrderInput) {
  const reference = await addDoc(collection(getFirebaseDb(), 'orders'), {
    userId: uid,
    customerName,
    role,
    ...input,
    status: 'Processing',
    createdAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  await updateDoc(doc(getFirebaseDb(), 'orders', orderId), { status, updatedAt: serverTimestamp() });
}

export async function updateServiceStatus(serviceId: string, status: ServiceRequest['status']) {
  await updateDoc(doc(getFirebaseDb(), 'services', serviceId), { status, updatedAt: serverTimestamp() });
}

export function subscribeToServices(uid: string, role: Role, callback: (services: ServiceRequest[]) => void, onError: (error: Error) => void) {
  const servicesRef = collection(getFirebaseDb(), 'services');
  const servicesQuery = role === 'Admin'
    ? query(servicesRef, orderBy('createdAt', 'desc'))
    : query(servicesRef, where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    servicesQuery,
    (snapshot) => callback(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        name: data.customerName,
        service: data.service,
        date: data.date,
        status: data.status,
      } satisfies ServiceRequest;
    })),
    onError,
  );
}

export async function createServiceRequest(uid: string, customerName: string, input: ServiceInput) {
  const reference = await addDoc(collection(getFirebaseDb(), 'services'), {
    userId: uid,
    customerName,
    ...input,
    status: 'Scheduled',
    createdAt: serverTimestamp(),
  });
  return reference.id;
}

export function subscribeToDealerApplications(callback: (applications: DealerApplication[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    query(collection(getFirebaseDb(), 'dealerApplications'), orderBy('createdAt', 'desc')),
    (snapshot) => callback(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        uid: data.uid,
        name: data.businessName,
        city: data.city,
        status: data.status,
      } satisfies DealerApplication;
    })),
    onError,
  );
}

export function subscribeToDealerApplication(uid: string, callback: (application: DealerApplication | null) => void, onError: (error: Error) => void) {
  return onSnapshot(
    doc(getFirebaseDb(), 'dealerApplications', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        uid: data.uid,
        name: data.businessName,
        city: data.city,
        status: data.status,
      });
    },
    onError,
  );
}

export async function submitDealerApplication(uid: string, businessName: string, city: string) {
  await setDoc(doc(getFirebaseDb(), 'dealerApplications', uid), {
    uid,
    businessName: businessName.trim(),
    city: city.trim(),
    status: 'Pending',
    createdAt: serverTimestamp(),
  });
}

export async function decideDealerApplication(uid: string, status: 'Approved' | 'Rejected') {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, 'dealerApplications', uid), { status, updatedAt: serverTimestamp() });
  batch.update(doc(db, 'users', uid), { role: status === 'Approved' ? 'Dealer' : 'Customer' });
  await batch.commit();
}
