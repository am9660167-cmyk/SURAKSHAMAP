import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Moon,
  Navigation,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import { isAdminUser, useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';

interface SidebarProps {
  title: string;
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarProps> = ({ title, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { hazards, unreadCount, settings, toggleTheme } = useSafetyData();
  const pendingCount = hazards.filter((h) => h.status === 'Pending').length;

  const showAdmin = isAdminUser(user);

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Explore Hazard Map', to: '/explore', icon: MapIcon },
    { label: 'Report a Hazard', to: '/report', icon: AlertTriangle },
    { label: 'Plan Your Journey', to: '/plan-journey', icon: Navigation },
    { label: 'Nearby Hazards', to: '/nearby', icon: Compass },
    { label: 'My Reports', to: '/my-reports', icon: FileText },
    {
      label: 'Notifications',
      to: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: 'Safety Guidelines', to: '/guidelines', icon: BookOpen },
    { label: 'Profile', to: '/profile', icon: User },
    { label: 'Settings', to: '/settings', icon: Settings },
    ...(showAdmin
      ? [
          {
            label: 'Admin Dashboard',
            to: '/admin',
            icon: ShieldCheck,
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  const renderLinks = (isMobile = false) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => isMobile && setMobileOpen(false)}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-[#2563EB] text-white'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
            }`}
            title={collapsed && !isMobile ? item.label : undefined}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon size={18} className="shrink-0" />
              {(!collapsed || isMobile) && (
                <span className="truncate whitespace-nowrap">{item.label}</span>
              )}
            </span>
            {(!collapsed || isMobile) && item.badge !== undefined && (
              <span
                className={`ml-2 font-mono text-xs font-semibold tabular-nums ${
                  active ? 'text-blue-100' : 'text-[#DC2626] dark:text-red-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex dark:border-slate-800 dark:bg-slate-950 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-[#14213D] dark:text-white overflow-hidden"
          >
            <Shield size={20} className="shrink-0 text-[#2563EB]" />
            {!collapsed && <span className="truncate text-base">SurakshaMap</span>}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {renderLinks(false)}

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          ) : (
            <Link
              to="/signin"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {collapsed ? <User size={16} /> : <span>Sign In</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 font-bold text-[#14213D] dark:text-white"
              >
                <Shield size={20} className="text-[#2563EB]" />
                <span>SurakshaMap</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            {renderLinks(true)}
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full rounded-lg bg-[#2563EB] px-3 py-2 text-center text-sm font-semibold text-white"
                >
                  Sign In
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden dark:border-slate-700 dark:text-slate-300"
            >
              <Menu size={18} />
            </button>
            <h1 className="truncate text-lg font-bold text-[#14213D] dark:text-white">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              to="/report"
              className="hidden rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <AlertTriangle size={14} />
              Report Hazard
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <img
                src={user?.avatarUrl ?? '/src/assets/images/avatar_citizen_profile_1794641736396.jpg'}
                alt={user?.fullName ?? 'Guest Citizen'}
                referrerPolicy="no-referrer"
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="hidden max-w-[120px] truncate sm:inline">
                {user?.fullName ?? 'Guest Citizen'}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
