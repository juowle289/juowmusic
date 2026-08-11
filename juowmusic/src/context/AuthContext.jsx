import { createContext, useContext, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import emailjs from '@emailjs/browser';
import { auth } from '@/firebase';
import { getFriendlyAuthError } from '@/utils/authErrors';
import { EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_WELCOME_TEMPLATE_ID } from '@/config/emailjs';

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
      sendWelcomeEmail(username || email, email);
      return credential.user;
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  /**
   * Fire-and-forget welcome email via EmailJS. Deliberately not awaited by
   * `register()` and its own failure is only logged - a flaky/misconfigured
   * email send should never block someone from finishing sign-up.
   */
  function sendWelcomeEmail(toName, toEmail) {
    emailjs
      .send(
        EMAILJS_SERVICE_ID,
        EMAILJS_WELCOME_TEMPLATE_ID,
        { to_name: toName, to_email: toEmail },
        { publicKey: EMAILJS_PUBLIC_KEY },
      )
      .catch((error) => {
        console.error('[juowmusic] Welcome email failed to send:', error);
      });
  }

  async function login(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
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
      if (getAdditionalUserInfo(credential)?.isNewUser) {
        sendWelcomeEmail(credential.user.displayName || credential.user.email, credential.user.email);
      }
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
      // Only `url` here, no `handleCodeInApp: true` - that flag is for
      // continuing the flow inside a *mobile* app (it expects an iOS
      // bundle ID / Android package name, and on the currently-deployed
      // SDK still routes through Firebase's now-defunct Dynamic Links
      // infrastructure to build that deep link), which is why setting it
      // for this web-only app made sendPasswordResetEmail fail outright
      // instead of erroring visibly.
      //
      // For a plain web app, Firebase's own docs (Auth ▸ "Passing State
      // in Email Actions") call for leaving handleCodeInApp unset/false:
      // the emailed link then goes to Firebase's own hosted action page,
      // which itself already performs the reset - `url` here becomes the
      // "back to app" link shown after that succeeds.
      //
      // To make the emailed link open THIS app's own /auth/action page
      // directly (matching the site's design instead of Firebase's
      // generic hosted one), set the Action URL in the Firebase Console:
      // Authentication -> Templates -> Password reset -> pencil icon ->
      // Customize action URL -> `https://<your-domain>/auth/action`.
      // That's a project-level setting, not something this code can set.
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
      });
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  /** Confirms the oobCode from a password-reset email is still valid before
   * showing the "choose a new password" form, and returns the account's
   * email so that form can say whose password is being reset. */
  async function verifyResetCode(oobCode) {
    try {
      return await verifyPasswordResetCode(auth, oobCode);
    } catch (error) {
      throw new Error(getFriendlyAuthError(error));
    }
  }

  /** Finishes a password reset started via the emailed link, using the
   * oobCode Firebase appended to /auth/action's URL. */
  async function confirmReset(oobCode, newPassword) {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
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
    verifyResetCode,
    confirmReset,
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
