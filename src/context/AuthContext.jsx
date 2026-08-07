import { createContext, useContext, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/firebase';
import { getFriendlyAuthError } from '@/utils/authErrors';

const AuthContext = createContext(undefined);

/**
 * Wraps the Firebase `User` object in a plain, React-friendly snapshot.
 * `onAuthStateChanged` fires with the live SDK instance on sign-in/out, but
 * profile-only changes (updateProfile/updateEmail) don't retrigger it - so
 * `refreshUser()` below calls this again to force a fresh object reference
 * and get components to re-render with the new displayName/email.
 */
function toUserSnapshot(firebaseUser) {
  if (!firebaseUser) return null;
  const { uid, email, displayName, photoURL, emailVerified } = firebaseUser;
  return { uid, email, displayName, photoURL, emailVerified };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Keeps the logged-in user in sync across the whole app, and restores
    // the session automatically on page reload (no more losing login state
    // on F5 - Firebase persists the session in IndexedDB itself).
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.info('[juowmusic][AuthContext] onAuthStateChanged ->', firebaseUser?.email ?? null);
      setUser(toUserSnapshot(firebaseUser));
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  function refreshUser() {
    setUser(toUserSnapshot(auth.currentUser));
  }

  async function register(email, password, username) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (username) {
        await updateProfile(credential.user, { displayName: username });
      }
      refreshUser();
      setUser(toUserSnapshot(auth.currentUser));
      return credential.user;
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  async function login(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      console.info('[juowmusic][AuthContext] login() success ->', credential.user.email);
      setUser(toUserSnapshot(credential.user));
      return credential.user;
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      setUser(toUserSnapshot(credential.user));
      return credential.user;
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  /**
   * Firebase requires a "recent" login before letting an account change its
   * email or password. Since the settings form already asks for the current
   * password, we use it to silently re-authenticate right before a sensitive
   * update instead of forcing the user through a full re-login.
   */
  async function reauthenticate(currentPassword) {
    if (!auth.currentUser?.email) {
      throw new Error('No active session found. Please log in again.');
    }
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  /** Updates display name / email / password on the current account. Pass
   * only the fields that changed - untouched ones are skipped. */
  async function updateUserProfile({ username, email, newPassword }) {
    if (!auth.currentUser) {
      throw new Error('No active session found. Please log in again.');
    }
    try {
      if (username !== undefined && username !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: username });
      }
      if (email !== undefined && email !== auth.currentUser.email) {
        await firebaseUpdateEmail(auth.currentUser, email);
      }
      if (newPassword) {
        await firebaseUpdatePassword(auth.currentUser, newPassword);
      }
      refreshUser();
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  const value = {
    user,
    initializing,
    register,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    reauthenticate,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
