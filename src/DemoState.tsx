import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  UserProfile,
  subscribeToAuth,
  subscribeToDealerApplication,
  subscribeToDealerApplications,
  subscribeToOrders,
  subscribeToProfile,
  subscribeToServices,
} from './firebaseData';
import { firebaseEnabled } from './firebaseApp';

export type Role = 'Customer' | 'Dealer' | 'Admin';

export type Order = {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: 'Processing' | 'Confirmed' | 'Shipped' | 'Delivered';
  items: number;
};

export type ServiceRequest = {
  id: string;
  name: string;
  service: string;
  date: string;
  status: 'Scheduled' | 'In review';
};

export type DealerApplication = {
  id: string;
  uid?: string;
  name: string;
  city: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

type DemoStateValue = {
  role: Role;
  setRole: React.Dispatch<React.SetStateAction<Role>>;
  authUser: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  firebaseError: string;
  setFirebaseError: (message: string) => void;
  firebaseEnabled: boolean;
  cart: Record<string, number>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  services: ServiceRequest[];
  setServices: React.Dispatch<React.SetStateAction<ServiceRequest[]>>;
  dealerApplications: DealerApplication[];
  setDealerApplications: React.Dispatch<React.SetStateAction<DealerApplication[]>>;
};

const DemoStateContext = createContext<DemoStateValue | null>(null);

const initialOrders: Order[] = [
  { id: 'AP-24091', customer: 'Ananya Mehta', date: '18 Oct 2026', total: 18490, status: 'Shipped', items: 1 },
  { id: 'AP-24076', customer: 'You', date: '14 Oct 2026', total: 2070, status: 'Delivered', items: 2 },
  { id: 'AP-24032', customer: 'Rohan Shah', date: '10 Oct 2026', total: 14990, status: 'Confirmed', items: 1 },
];

const initialServices: ServiceRequest[] = [
  { id: 'SR-0184', name: 'Ananya Mehta', service: 'Routine maintenance', date: '24 Oct · 10:30 AM', status: 'Scheduled' },
  { id: 'SR-0183', name: 'Rohan Shah', service: 'Filter replacement', date: '25 Oct · 2:00 PM', status: 'In review' },
];

const initialDealerApplications: DealerApplication[] = [
  { id: 'DL-031', name: 'HydroCare Solutions', city: 'Pune, Maharashtra', status: 'Pending' },
  { id: 'DL-032', name: 'ClearSpring Traders', city: 'Coimbatore, Tamil Nadu', status: 'Pending' },
  { id: 'DL-033', name: 'BluePeak Water Systems', city: 'Jaipur, Rajasthan', status: 'Pending' },
];

export function DemoStateProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role>('Customer');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(firebaseEnabled);
  const [firebaseError, setFirebaseError] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState(firebaseEnabled ? [] : initialOrders);
  const [services, setServices] = useState(firebaseEnabled ? [] : initialServices);
  const [dealerApplications, setDealerApplications] = useState(firebaseEnabled ? [] : initialDealerApplications);

  useEffect(() => {
    if (!firebaseEnabled) return;
    return subscribeToAuth((user) => {
      setAuthUser(user);
      setProfile(null);
      setOrders([]);
      setServices([]);
      setDealerApplications([]);
      setAuthLoading(false);
      setFirebaseError('');
    });
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !authUser) return;
    return subscribeToProfile(authUser.uid, setProfile, (error) => setFirebaseError(error.message));
  }, [authUser]);

  useEffect(() => {
    if (!firebaseEnabled || !authUser || !profile) return;
    const reportError = (error: Error) => setFirebaseError(error.message);
    const unsubscribeOrders = subscribeToOrders(authUser.uid, profile.role, setOrders, reportError);
    const unsubscribeServices = subscribeToServices(authUser.uid, profile.role, setServices, reportError);
    let unsubscribeDealers: () => void = () => undefined;
    if (profile.role === 'Admin') {
      unsubscribeDealers = subscribeToDealerApplications(setDealerApplications, reportError);
    } else {
      unsubscribeDealers = subscribeToDealerApplication(authUser.uid, (application) => {
        setDealerApplications(application ? [application] : []);
      }, reportError);
    }
    return () => {
      unsubscribeOrders();
      unsubscribeServices();
      unsubscribeDealers();
    };
  }, [authUser, profile]);

  const activeRole = firebaseEnabled ? profile?.role ?? 'Customer' : role;

  return (
    <DemoStateContext.Provider value={{
      role: activeRole,
      setRole,
      authUser,
      profile,
      authLoading,
      firebaseError,
      setFirebaseError,
      firebaseEnabled,
      cart,
      setCart,
      orders,
      setOrders,
      services,
      setServices,
      dealerApplications,
      setDealerApplications,
    }}>
      {children}
    </DemoStateContext.Provider>
  );
}

export function useDemoState() {
  const state = useContext(DemoStateContext);
  if (!state) throw new Error('useDemoState must be used inside DemoStateProvider');
  return state;
}
