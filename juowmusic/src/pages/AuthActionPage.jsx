import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { handleImageError } from '@/lib/imageFallback';

/**
 * Lands here when someone clicks the link in a "reset your password" email
 * (see AuthContext.resetPassword's actionCodeSettings). Firebase appends
 * `?mode=resetPassword&oobCode=...` to the URL - without a route to catch
 * that, the link would instead open Firebase's own generic, unstyled
 * hosted page, which is what made the flow look broken.
 *
 * Currently only handles `mode=resetPassword`; other action modes (email
 * verification, email-change recovery) aren't used anywhere else in the
 * app yet, so they just show a clear "invalid link" state instead of
 * silently doing nothing.
 */
export default function AuthActionPage() {
  const [searchParams] = useSearchParams();
  const { verifyResetCode, confirmReset } = useAuth();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [status, setStatus] = useState('checking'); // 'checking' | 'ready' | 'invalid' | 'done'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'resetPassword' || !oobCode) {
      setStatus('invalid');
      return;
    }
    verifyResetCode(oobCode)
      .then((accountEmail) => {
        setEmail(accountEmail);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('invalid');
      });
  }, [mode, oobCode, verifyResetCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmReset(oobCode, password);
      setStatus('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const logo = (
    <img
      src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-J.png"
      alt="Juowle"
      className="mx-auto mb-4 size-11 rounded-xl bg-black p-2.5"
      onError={handleImageError}
    />
  );

  if (status === 'checking') {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-black shadow-2xl shadow-black/40">
        <section className="px-6 py-14 text-center">
          {logo}
          <p className="text-sm text-black/60">Checking your link…</p>
        </section>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-black shadow-2xl shadow-black/40">
        <section className="px-6 py-10 text-center sm:px-10 sm:py-12">
          {logo}
          <h1 className="text-2xl font-semibold">This link isn&apos;t valid</h1>
          <p className="mt-1 text-sm text-black/60">
            It may have already been used, or it&apos;s expired. Request a new reset link and try again.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-medium text-white hover:bg-black/90"
          >
            Back to log in
          </Link>
        </section>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-black shadow-2xl shadow-black/40">
        <section className="px-6 py-10 text-center sm:px-10 sm:py-12">
          {logo}
          <h1 className="text-2xl font-semibold">Password updated</h1>
          <p className="mt-1 text-sm text-black/60">You can now log in with your new password.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-medium text-white hover:bg-black/90"
          >
            Back to log in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-black shadow-2xl shadow-black/40">
      <section className="px-6 py-10 sm:px-10 sm:py-12">
        <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-sm space-y-5">
          <div className="text-center">
            {logo}
            <h1 className="text-2xl font-semibold">Choose a new password</h1>
            <p className="mt-1 text-sm text-black/60">for {email}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-black/15 pr-11"
              />
              <button
                type="button"
                className="absolute top-2.5 right-3 text-black/50 hover:text-black"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm new password
            </label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={cn('h-11 rounded-xl', error === 'Passwords do not match.' ? 'border-red-500' : 'border-black/15')}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting} className="h-11 w-full rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-60">
            {submitting ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </section>
    </div>
  );
}
