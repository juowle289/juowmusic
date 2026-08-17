import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { handleImageError } from "@/lib/imageFallback";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, initializing, login, loginWithGoogle, resetPassword } =
    useAuth();

  const [view, setView] = useState("login"); // 'login' | 'forgot'

  // --- Login form state ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleNotice, setGoogleNotice] = useState("");
  const [error, setError] = useState("");
  const [awaitingGoogleAuth, setAwaitingGoogleAuth] = useState(false);

  // Safety net for Google sign-in only: if the popup succeeds but its promise
  // never resolves back to us (can happen with strict popup/COOP setups),
  // redirect as soon as the auth state actually updates. Gated behind
  // `awaitingGoogleAuth` (only set true while a Google attempt is in
  // flight) so this never fires just because the page happens to mount
  // while an older session is still around - that caused the login/signup
  // form to flash and immediately bounce back to the homepage.
  useEffect(() => {
    if (awaitingGoogleAuth && !initializing && user) {
      navigate("/", { replace: true });
    }
  }, [awaitingGoogleAuth, user, initializing, navigate]);

  // --- Forgot-password form state ---
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetStatus, setResetStatus] = useState(null); // { type: 'success'|'error', message }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleSubmitting(true);
    setAwaitingGoogleAuth(true);
    try {
      const loggedInUser = await loginWithGoogle();
      setGoogleNotice(`Signed in as ${loggedInUser.email}. Redirecting…`);
      // The useEffect above also redirects once `user` updates - this is
      // just a slightly snappier path for the common case.
      navigate("/");
    } catch (err) {
      setAwaitingGoogleAuth(false);
      setError(err.message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email);
    setResetStatus(null);
    setView("forgot");
  };

  const getResetPasswordErrorMessage = (error) => {
    const code = error?.code || "";
    const message = error?.message || "";

    if (code === "auth/user-not-found") {
      return "No account was found for this email. Please check the address or sign up first.";
    }

    if (code === "auth/invalid-email") {
      return "This email address is invalid. Please enter a valid email format.";
    }

    if (code === "auth/too-many-requests") {
      return "Too many reset attempts. Please wait a moment and try again later.";
    }

    if (code === "auth/network-request-failed") {
      return "Network error. Please check your connection and try again.";
    }

    if (message) {
      return message
        .replace(/^Firebase:\s*/i, "")
        .replace(/\s*\(auth\/[^)]+\)\.?$/i, "");
    }

    return "Unable to send the reset link right now. Please try again.";
  };

  const handleSendReset = async (e) => {
    e.preventDefault();
    const normalizedEmail = resetEmail.trim();

    if (!normalizedEmail) {
      setResetStatus({
        type: "error",
        message: "Please enter your email address.",
      });
      return;
    }

    setResetSubmitting(true);
    setResetStatus(null);

    try {
      await resetPassword(normalizedEmail);
      setResetStatus({
        type: "success",
        message: `Password reset link sent to ${normalizedEmail}. Please check your inbox.`,
      });
    } catch (err) {
      setResetStatus({
        type: "error",
        message: getResetPasswordErrorMessage(err),
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  if (view === "forgot") {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-black shadow-2xl shadow-black/40">
        <section className="px-6 py-10 sm:px-10 sm:py-12">
          <form
            onSubmit={handleSendReset}
            noValidate
            className="mx-auto w-full max-w-sm space-y-5"
          >
            <div className="text-center">
              <img
                src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
                alt="Juowle"
                className="mx-auto mb-4 size-11 rounded-xl bg-black p-2.5"
                onError={handleImageError}
              />
              <h1 className="text-2xl font-semibold">Reset your password</h1>
              <p className="mt-1 text-sm text-black/60">
                We&apos;ll email you a link to reset it.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="reset-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={cn(
                  "h-11 rounded-xl",
                  resetStatus?.type === "error"
                    ? "border-red-500"
                    : "border-black/15",
                )}
              />
            </div>

            {resetStatus && (
              <p
                className={cn(
                  "text-sm",
                  resetStatus.type === "success"
                    ? "text-green-600"
                    : "text-red-600",
                )}
              >
                {resetStatus.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={resetSubmitting}
              className="h-11 w-full rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-60"
            >
              {resetSubmitting ? "Sending…" : "Send reset link"}
            </Button>

            <button
              type="button"
              onClick={() => setView("login")}
              className="w-full text-center text-sm font-medium text-black/70 underline-offset-4 hover:text-black hover:underline"
            >
              Back to log in
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-black shadow-2xl shadow-black/40">
      <section className="px-6 py-10 sm:px-10 sm:py-12">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mx-auto w-full max-w-sm space-y-5"
        >
          <div className="text-center">
            <img
              src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
              alt="Juowle"
              className="mx-auto mb-4 size-11 rounded-xl bg-black p-2.5"
              onError={handleImageError}
            />
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-sm text-black/60">
              Let&apos;s sign you in to Juowle
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={googleSubmitting}
              className="h-11 w-full justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-medium text-black hover:border-black/25 hover:bg-black/5 disabled:opacity-60"
            >
              <img
                src="https://companieslogo.com/img/orig/GOOG-0ed88f7c.png?t=1633218227"
                alt=""
                className="size-4"
                onError={handleImageError}
              />
              {googleSubmitting ? "Connecting…" : "Continue with Google"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-medium text-black hover:border-black/25 hover:bg-black/5"
            >
              <img
                src="https://cdn.freebiesupply.com/images/large/2x/apple-logo-transparent.png"
                alt=""
                className="size-4"
                onError={handleImageError}
              />
              Continue with Apple
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-black/40">
            <hr className="flex-1 border-black/10" />
            <span>OR</span>
            <hr className="flex-1 border-black/10" />
          </div>

          <div className="space-y-2">
            <label htmlFor="lg-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="lg-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "h-11 rounded-xl",
                error && !email ? "border-red-500" : "border-black/15",
              )}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lg-password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="lg-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "h-11 rounded-xl pr-11",
                  error && !password ? "border-red-500" : "border-black/15",
                )}
              />
              <button
                type="button"
                className="absolute top-2.5 right-3 text-black/50 hover:text-black"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-black/70">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-black/30 accent-black"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={openForgotPassword}
              className="text-black/60 hover:text-black hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {googleNotice && (
            <p className="text-center text-sm text-green-600">{googleNotice}</p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-60"
          >
            {submitting ? "Logging in…" : "Log In"}
          </Button>

          <p className="text-center text-sm text-black/70">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-black underline-offset-4 hover:underline"
            >
              Sign up.
            </Link>
          </p>

          <p className="text-center text-xs text-black/40">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-black/70">
              Terms of Service
            </a>{" "}
            and{" "}
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
