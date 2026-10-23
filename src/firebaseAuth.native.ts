import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { firebaseEnabled, getFirebaseApp } from './firebaseApp';

export const firebaseAuth: Auth | null = firebaseEnabled
  ? initializeAuth(getFirebaseApp(), {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : null;
