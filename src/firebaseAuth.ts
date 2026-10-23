import { Auth, getAuth } from 'firebase/auth';
import { firebaseEnabled, getFirebaseApp } from './firebaseApp';

export const firebaseAuth: Auth | null = firebaseEnabled ? getAuth(getFirebaseApp()) : null;
