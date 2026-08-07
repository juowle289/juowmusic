/**
 * Maps Firebase Auth error codes (error.code, e.g. "auth/wrong-password")
 * to short, user-friendly messages. Falls back to the raw Firebase message
 * (with the "Firebase: " / "(auth/...)" noise stripped) for anything not
 * explicitly listed here, so an unexpected error still shows *something*
 * readable instead of crashing the form.
 */
const MESSAGES = {
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/missing-password': 'Please enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — please check your connection and try again.',
  'auth/requires-recent-login': 'For security, please re-enter your current password to confirm this change.',
  'auth/popup-closed-by-user': 'The popup was closed before completing sign-in.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Please allow popups and try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
};

export function getFriendlyAuthError(error) {
  const code = error?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];

  // Firebase's default message looks like: "Firebase: Error (auth/foo-bar)."
  // Strip that down to something a bit more presentable if we don't have an
  // explicit mapping above.
  const raw = error?.message || 'Something went wrong. Please try again.';
  return raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/i, '');
}
