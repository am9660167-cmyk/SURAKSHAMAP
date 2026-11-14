import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

interface SignInLocationState {
  prefillEmail?: string;
  accountCreatedMessage?: string;
}

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as SignInLocationState | null) ?? null;

  const {
    signIn,
    requestPasswordReset,
    signInWithGoogleDemo,
    authCallbackError,
    authCallbackNotice,
    clearAuthCallbackMessages,
  } = useAuth();

  const [email, setEmail] = useState(routeState?.prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearAuthCallbackMessages();
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await signIn(email, password, rememberMe);
      if (!result.ok) {
        setError(result.error ?? 'Sign in failed.');
        return;
      }
      navigate(result.user?.role === 'admin' ? '/admin' : '/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    signInWithGoogleDemo('citizen');
    navigate('/dashboard');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    if (!resetEmail.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }
    setResetSubmitting(true);
    try {
      const result = await requestPasswordReset(resetEmail);
      if (!result.ok) {
        setResetError(result.error ?? 'Unable to send reset link.');
        return;
      }
      setResetMessage(
        result.message ?? `Password reset instructions sent to ${resetEmail}.`
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120]">
      <Navbar />

      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2563EB] dark:text-blue-400">
            <Shield size={18} />
            <span>SurakshaMap Account</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#14213D] dark:text-white">
            Sign in to your workspace
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Access your safety dashboard, submitted reports, and journey planner.
          </p>

          {forgotMode ? (
            <form onSubmit={handleForgotSubmit} className="mt-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Reset Password
              </h2>
              {resetError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {resetError}
                </div>
              )}
              {resetMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {resetMessage}
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Enter your registered email to receive password reset instructions.
                  </p>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {resetSubmitting ? 'Sending Link...' : 'Send Reset Link'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setResetError('');
                  setResetMessage('');
                }}
                className="text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                {(authCallbackNotice || routeState?.accountCreatedMessage) && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {authCallbackNotice || routeState?.accountCreatedMessage}
                  </div>
                )}
                {(error || authCallbackError) && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                    {error || authCallbackError}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={15} className="absolute left-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Remember Me
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span>or</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                Sign in with Google
              </button>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    signInWithGoogleDemo('admin');
                    navigate('/admin');
                  }}
                  className="font-medium text-slate-600 hover:text-[#2563EB] dark:text-slate-400"
                >
                  Quick Demo: Admin Console →
                </button>
                <Link
                  to="/signup"
                  className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                >
                  Create an account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
