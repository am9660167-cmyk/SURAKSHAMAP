import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, Shield, User } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  const {
    signUp,
    signInWithGoogleDemo,
    authCallbackError,
    authCallbackNotice,
    clearAuthCallbackMessages,
  } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationMsg, setConfirmationMsg] = useState('');

  const displayError = error || authCallbackError;

  useEffect(() => {
    if (displayError) {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [displayError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConfirmationMsg('');
    clearAuthCallbackMessages();

    const trimmedEmail = email.trim().toLowerCase();

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('Please check the Terms and Conditions box before creating your account.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp({ fullName, email: trimmedEmail, phone, password });
      if (!res.ok) {
        setError(res.error ?? 'Could not create account.');
        return;
      }
      if (res.needsEmailConfirmation) {
        const msg =
          res.message ??
          `Account created for ${trimmedEmail}! Please check your email inbox and confirm your address before signing in.`;
        setConfirmationMsg(msg);
        navigate('/signin', {
          replace: true,
          state: {
            prefillEmail: trimmedEmail,
            accountCreatedMessage: msg,
          },
        });
        return;
      }
      navigate('/dashboard', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120]">
      <Navbar />

      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2563EB] dark:text-blue-400">
            <Shield size={18} />
            <span>Join SurakshaMap</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#14213D] dark:text-white">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Report street hazards, confirm community alerts, and plan informed journeys.
          </p>

          {confirmationMsg || authCallbackNotice ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                {confirmationMsg || authCallbackNotice}
              </div>
              <Link
                to="/signin"
                className="block w-full rounded-lg bg-[#2563EB] py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              {displayError && (
                <div
                  ref={errorBannerRef}
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
                >
                  <span className="font-semibold">Account not created: </span>
                  {displayError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ananya Rao"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

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
                  Phone Number <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative flex items-center">
                  <Phone size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 00000"
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
                    placeholder="Minimum 6 characters"
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

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  I agree to the SurakshaMap Terms and Conditions and understand that
                  community hazard data is advisory only.
                </span>
              </label>

              {displayError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
                >
                  <span className="font-semibold">Account not created: </span>
                  {displayError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span>or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={() => {
              signInWithGoogleDemo('citizen');
              navigate('/dashboard');
            }}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
              />
            </svg>
            Sign up with Google
          </button>

          <p className="mt-5 text-center text-xs text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/signin"
              className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
