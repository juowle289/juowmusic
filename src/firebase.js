import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCvdpH41WmqRCeAri0CU6XXRecDIhbDlBk',
  authDomain: 'juowmusic.firebaseapp.com',
  projectId: 'juowmusic',
  storageBucket: 'juowmusic.firebasestorage.app',
  messagingSenderId: '466598925021',
  appId: '1:466598925021:web:ee0ede41f74255ee5f0134',
  measurementId: 'G-7Y82G30JPL',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Backs the admin dashboard's Songs/Artists CRUD (see src/lib/adminData.js).
export const db = getFirestore(app);

export default app;
