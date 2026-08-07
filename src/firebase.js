import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

export default app;
