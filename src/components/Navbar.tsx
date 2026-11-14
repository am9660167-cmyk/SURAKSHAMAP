import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Shield, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';

export const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { settings, toggleTheme } = useSafetyData();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSectionNav = (sectionId: string) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#14213D] whitespace-nowrap shrink-0 dark:text-white"
        >
          <Shield size={20} className="text-[#2563EB]" />
          <span>SurakshaMap</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
          <Link
            to="/"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={() => handleSectionNav('about')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => handleSectionNav('features')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            Features
          </button>
          <Link
            to="/explore"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            Explore Map
          </Link>
          <button
            type="button"
            onClick={() => handleSectionNav('contact')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            Contact
          </button>
          {!isAuthenticated && (
            <Link
              to="/signin"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
            >
              Sign In
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            to={isAuthenticated ? '/dashboard' : '/signup'}
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            {isAuthenticated ? 'Dashboard' : 'Sign Up'}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
            className="rounded-lg border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Link to="/" onClick={() => setMobileOpen(false)} className="py-1.5">
              Home
            </Link>
            <button
              type="button"
              onClick={() => handleSectionNav('about')}
              className="py-1.5 text-left"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => handleSectionNav('features')}
              className="py-1.5 text-left"
            >
              Features
            </button>
            <Link to="/explore" onClick={() => setMobileOpen(false)} className="py-1.5">
              Explore Map
            </Link>
            <Link to="/plan-journey" onClick={() => setMobileOpen(false)} className="py-1.5">
              Plan Your Journey
            </Link>
            <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="py-1.5">
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => handleSectionNav('contact')}
              className="py-1.5 text-left"
            >
              Contact
            </button>
            <div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link
                to="/signin"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-center font-semibold dark:border-slate-700"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg bg-[#2563EB] py-2 text-center font-semibold text-white"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
