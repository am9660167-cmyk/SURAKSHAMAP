import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Crosshair,
  Lock,
  LogOut,
  Moon,
  RotateCcw,
  Sun,
} from 'lucide-react';
import { SidebarLayout } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    settings,
    updateSettings,
    detectUserLocation,
    gpsStatus,
    resetDemoData,
  } = useSafetyData();

  return (
    <SidebarLayout title="Settings">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Appearance */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-[#14213D] dark:text-white">
            Appearance Mode
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Choose between Light Mode and Dark Mode across all dashboards and maps.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                settings.theme === 'light'
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Sun size={16} />
              Light Mode
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                settings.theme === 'dark'
                  ? 'border-[#2563EB] bg-blue-950/60 text-blue-400'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Moon size={16} />
              Dark Mode
            </button>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#14213D] dark:text-white">
              Notification Preferences
            </h2>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {[
              {
                key: 'nearbyAlerts' as const,
                label: 'Nearby Hazard Alerts',
                desc: 'Notify when new hazards are reported within your alert radius.',
              },
              {
                key: 'criticalAlerts' as const,
                label: 'Critical Hazard Alerts',
                desc: 'Immediate alerts for open manholes, live wires, and flooded roads.',
              },
              {
                key: 'verifiedUpdates' as const,
                label: 'Report Status Updates',
                desc: 'Notify when your submitted reports are verified or resolved.',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Location Permissions */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crosshair size={16} className="text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                Location Permissions
              </h2>
            </div>
            <span className="font-mono text-xs font-semibold capitalize text-slate-600 dark:text-slate-400">
              Status: {settings.locationPermission}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Used to center the map on your neighborhood and detect nearby hazards. You
            can always select locations manually if permission is denied.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void detectUserLocation()}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {gpsStatus === 'detecting' ? 'Requesting GPS...' : 'Test / Grant GPS Location'}
            </button>
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#14213D] dark:text-white">
              Privacy Settings
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Anonymous Hazard Reporting
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Display "Community Member" instead of your name on public reports.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.anonymousReporting}
                onChange={(e) =>
                  updateSettings({ anonymousReporting: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Share Approximate Zone Only
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Keep exact personal home coordinates private in community feeds.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shareApproximateLocation}
                onChange={(e) =>
                  updateSettings({ shareApproximateLocation: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </section>

        {/* Account & Demo Controls */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={resetDemoData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={14} />
            Reset Sample Hazards
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/signin');
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <LogOut size={14} />
            Logout
          </button>
        </section>
      </div>
    </SidebarLayout>
  );
};
