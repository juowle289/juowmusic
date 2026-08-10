import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const USERNAME_MIN_LENGTH = 6;

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, initializing, register, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleNotice, setGoogleNotice] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ username: false, confirm: false });
  const [awaitingGoogleAuth, setAwaitingGoogleAuth] = useState(false);

  // Safety net for Google sign-up only: if the popup succeeds but its promise
  // never resolves back to us, redirect as soon as the auth state actually
  // updates. Gated behind `awaitingGoogleAuth` so this never fires just
  // because the page happens to mount while an older session is still
  // around - that caused the form to flash and immediately bounce to home.
  useEffect(() => {
    if (awaitingGoogleAuth && !initializing && user) {
      navigate('/', { replace: true });
    }
  }, [awaitingGoogleAuth, user, initializing, navigate]);

  const usernameValid = username.length >= USERNAME_MIN_LENGTH;
  const usernameInvalid = touched.username && username.length > 0 && !usernameValid;

  const passwordChecks = {
    length: password.length > 12,
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[~!@#$%^&*()_+,.?{}|<>:"']/.test(password),
  };
  const passwordValid = Object.values(passwordChecks).every(Boolean);
  const confirmValid = confirmPassword.length > 0 && confirmPassword === password;
  const formValid = usernameValid && passwordValid && confirmValid && email.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ username: true, confirm: true });

    if (!usernameValid) {
      setError(`Username must be at least ${USERNAME_MIN_LENGTH} characters.`);
      return;
    }
    if (!passwordValid) {
      setError('Password does not meet the requirements below.');
      return;
    }
    if (!confirmValid) {
      setError('Passwords do not match!');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, username);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleSubmitting(true);
    setAwaitingGoogleAuth(true);
    try {
      const loggedInUser = await loginWithGoogle();
      setGoogleNotice(`Account created as ${loggedInUser.email}. Redirecting…`);
      navigate('/');
    } catch (err) {
      setAwaitingGoogleAuth(false);
      setError(err.message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-black shadow-2xl shadow-black/40">
      <section className="px-6 py-10 sm:px-10 sm:py-12">
        <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-sm space-y-5">
          <div className="text-center">
            <img src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-J.png" alt="Juowle" className="mx-auto mb-4 size-11 rounded-xl bg-black p-2.5" />
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="mt-1 text-sm text-black/60">Join Juowle in a few seconds</p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              disabled={googleSubmitting}
              className="h-11 w-full justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-medium text-black hover:border-black/25 hover:bg-black/5 disabled:opacity-60"
            >
              <img src="https://companieslogo.com/img/orig/GOOG-0ed88f7c.png?t=1633218227" alt="" className="size-4" />
              {googleSubmitting ? 'Connecting…' : 'Sign up with Google'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-medium text-black hover:border-black/25 hover:bg-black/5"
            >
              <img src="https://cdn.freebiesupply.com/images/large/2x/apple-logo-transparent.png" alt="" className="size-4" />
              Sign up with Apple
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-black/40">
            <hr className="flex-1 border-black/10" />
            <span>OR</span>
            <hr className="flex-1 border-black/10" />
          </div>

          <div className="space-y-2">
            <label htmlFor="su-userName" className="text-sm font-medium">
              Username<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="su-userName"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                className={cn(
                  'h-11 rounded-xl pr-10',
                  usernameInvalid ? 'border-red-500' : usernameValid ? 'border-green-600' : 'border-black/15',
                )}
              />
              {usernameValid && <CheckCircle2 className="absolute top-3 right-3 size-5 text-green-600" />}
            </div>
            <p className={cn('text-xs', usernameInvalid ? 'text-red-500' : 'text-black/40')}>
              At least {USERNAME_MIN_LENGTH} characters.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="su-email" className="text-sm font-medium">
              Email<span className="text-red-500">*</span>
            </label>
            <Input
              id="su-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border-black/15"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="su-password" className="text-sm font-medium">
              Password<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="su-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn('h-11 rounded-xl pr-16', passwordValid ? 'border-green-600' : 'border-black/15')}
              />
              <button
                type="button"
                className="absolute top-2.5 right-10 text-black/50 hover:text-black"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
              {passwordValid && <CheckCircle2 className="absolute top-3 right-3 size-5 text-green-600" />}
            </div>
            <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {[
                ['length', '13+ characters'],
                ['upper', '1 uppercase letter'],
                ['digit', '1 number'],
                ['symbol', '1 symbol'],
              ].map(([key, label]) => (
                <li
                  key={key}
                  className={cn('flex items-center gap-1.5', passwordChecks[key] ? 'text-green-600' : 'text-black/40')}
                >
                  {passwordChecks[key] ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="su-confirm-password" className="text-sm font-medium">
              Confirm Password<span className="text-red-500">*</span>
            </label>
            <Input
              id="su-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              className={cn(
                'h-11 rounded-xl',
                confirmPassword.length === 0 ? 'border-black/15' : confirmValid ? 'border-green-600' : 'border-red-500',
              )}
            />
            {touched.confirm && confirmPassword.length > 0 && !confirmValid && (
              <p className="text-xs text-red-500">Passwords do not match.</p>
            )}
          </div>

          {googleNotice && <p className="text-center text-sm text-green-600">{googleNotice}</p>}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting || !formValid} className="h-11 w-full rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-60">
            {submitting ? 'Creating account…' : 'Create your account'}
          </Button>

          <p className="text-center text-sm text-black/70">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-black underline-offset-4 hover:underline">
              Log In.
            </Link>
          </p>

          <p className="text-center text-xs text-black/40">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-black/70">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="underline hover:text-black/70">
              Privacy Policy
            </a>
            .
          </p>
        </form>
      </section>
    </div>
  );
}
