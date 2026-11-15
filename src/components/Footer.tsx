import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { isAdminUser, useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-lg font-bold text-[#14213D] dark:text-white"
            >
              <Shield size={19} className="text-[#2563EB]" />
              <span>SurakshaMap</span>
            </Link>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Know the Risks. Plan Your Route. Stay Aware. Crowd-sourced civic safety
              mapping built for everyday commuters, pedestrians, and neighborhoods.
            </p>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
              Advisory Notice: Hazard reports are community-contributed and informational.
              No route is guaranteed safe—always follow local traffic signs and official
              emergency guidance.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Platform
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/explore" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                  Explore Hazard Map
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                  Report a Hazard
                </Link>
              </li>
              <li>
                <Link to="/plan-journey" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                  Plan Your Journey
                </Link>
              </li>
              <li>
                <Link to="/guidelines" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                  Safety Guidelines
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Workspace
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/dashboard" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                  User Dashboard
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link to="/admin" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                    Admin Dashboard
                  </Link>
                </li>
              )}
              <li>
                <Link to="/signin" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-[#2563EB] dark:hover:text-blue-400">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center dark:border-slate-800 dark:text-slate-400">
          <span>© {new Date().getFullYear()} SurakshaMap Community Safety Platform.</span>
          <span>Google Maps Platform powered geolocation & route awareness.</span>
        </div>
      </div>
    </footer>
  );
};
