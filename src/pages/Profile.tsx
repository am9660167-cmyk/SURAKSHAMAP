import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, Mail, Phone, Save, User } from 'lucide-react';
import { SidebarLayout } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';

export const Profile: React.FC = () => {
  const { user, isAuthenticated, updateProfile, signInWithGoogleDemo } = useAuth();
  const { hazards } = useSafetyData();

  const [fullName, setFullName] = useState(user?.fullName ?? 'Ananya Rao');
  const [phone, setPhone] = useState(user?.phone ?? '+91 98450 23190');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? '');
    }
  }, [user?.id, user?.fullName, user?.phone]);

  const actorId = user?.id ?? 'user-demo-1';
  const myReports = hazards.filter(
    (h) => h.reporterId === actorId || h.reporterId === 'guest-citizen'
  );
  const myVerified = myReports.filter((h) => h.status === 'Verified').length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      signInWithGoogleDemo('citizen');
    }
    await updateProfile({ fullName, phone });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfile({ avatarUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <SidebarLayout title="Citizen Profile">
      <div className="mx-auto max-w-4xl space-y-6">
        {!isAuthenticated && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
            <span>
              Viewing guest citizen profile. Sign in or activate a demo session to
              persist custom profile edits.
            </span>
            <Link
              to="/signin"
              className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 font-semibold text-white"
            >
              Sign In
            </Link>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <img
                src={
                  user?.avatarUrl ??
                  '/src/assets/images/avatar_citizen_profile_1794641736396.jpg'
                }
                alt={fullName}
                referrerPolicy="no-referrer"
                className="h-24 w-24 rounded-full border-2 border-slate-200 object-cover dark:border-slate-700"
              />
              <label
                title="Update profile photograph"
                className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white bg-[#2563EB] text-white shadow-sm hover:bg-blue-700"
              >
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#14213D] dark:text-white">
                {user?.fullName ?? fullName}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                {user?.email ?? 'ananya.rao@surakshamap.org'} ·{' '}
                <span className="capitalize">{user?.role ?? 'citizen'}</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-6">
                <div>
                  <div className="font-mono text-xl font-bold text-[#14213D] tabular-nums dark:text-white">
                    {myReports.length}
                  </div>
                  <div className="text-xs text-slate-500">Total Reports</div>
                </div>
                <div>
                  <div className="font-mono text-xl font-bold text-[#16A34A] tabular-nums dark:text-emerald-400">
                    {myVerified}
                  </div>
                  <div className="text-xs text-slate-500">Verified Reports</div>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="mt-8 space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800"
          >
            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 size={15} />
                Profile changes saved.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
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
                    disabled
                    value={user?.email ?? 'ananya.rao@surakshamap.org'}
                    className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <div className="relative flex items-center">
                  <Phone size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Save size={15} />
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
};
