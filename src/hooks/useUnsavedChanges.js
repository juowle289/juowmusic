import { useEffect } from 'react';

/** Asks the browser to confirm before the tab is closed/reloaded/navigated
 * away while a form has unsaved edits. (React Router's own blocker needs a
 * data router; this app uses <BrowserRouter>, so in-app links are guarded by
 * the forms' own Cancel/Back buttons instead.) */
export default function useUnsavedChanges(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}
