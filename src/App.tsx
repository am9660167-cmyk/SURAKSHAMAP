/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SafetyDataProvider } from './context/SafetyDataContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { Dashboard } from './pages/Dashboard';
import { HazardMap } from './pages/HazardMap';
import { JourneyPlanner } from './pages/JourneyPlanner';
import { JourneyResults } from './pages/JourneyResults';
import { LandingPage } from './pages/LandingPage';
import { MyReports } from './pages/MyReports';
import { NearbyHazards } from './pages/NearbyHazards';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { ReportHazard } from './pages/ReportHazard';
import { SafetyGuidelines } from './pages/SafetyGuidelines';
import { Settings } from './pages/Settings';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-lg font-bold text-[#14213D] dark:text-white">
              Something went wrong loading SurakshaMap
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthCallbackRouter: React.FC = () => {
  const { authCallbackError, authCallbackNotice, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authCallbackError && location.pathname === '/') {
      navigate('/signin', { replace: true });
      return;
    }
    if (authCallbackNotice && isAuthenticated && location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [authCallbackError, authCallbackNotice, isAuthenticated, location.pathname, navigate]);

  return null;
};

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <SafetyDataProvider>
          <BrowserRouter>
            <AuthCallbackRouter />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/explore" element={<HazardMap />} />
              <Route path="/report" element={<ReportHazard />} />
              <Route path="/plan-journey" element={<JourneyPlanner />} />
              <Route path="/journey-results" element={<JourneyResults />} />
              <Route path="/nearby" element={<NearbyHazards />} />
              <Route path="/my-reports" element={<MyReports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/guidelines" element={<SafetyGuidelines />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SafetyDataProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
