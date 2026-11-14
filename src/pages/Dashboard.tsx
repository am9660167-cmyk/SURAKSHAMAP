import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Navigation,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CategoryIcon } from '../components/CategoryIcon';
import { MapView } from '../components/MapView';
import { SidebarLayout } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';
import { HazardReport } from '../types/safety';
import {
  formatRelativeDate,
  getCategoryMeta,
  getSeverityColor,
  getStatusColor,
} from '../utils/hazardHelpers';
import { formatDistance, haversineDistanceKm } from '../utils/location';

export const Dashboard: React.FC = () => {
  const { authCallbackNotice, clearAuthCallbackMessages } = useAuth();
  const {
    hazards,
    userLocation,
    notifications,
    detectUserLocation,
    useApproximateLocation,
    gpsStatus,
    gpsNotice,
    gpsError,
  } = useSafetyData();
  const [selectedHazard, setSelectedHazard] = useState<HazardReport | null>(null);

  const stats = useMemo(() => {
    const total = hazards.length;
    const verified = hazards.filter((h) => h.status === 'Verified').length;
    const pending = hazards.filter((h) => h.status === 'Pending').length;
    const resolved = hazards.filter((h) => h.status === 'Resolved').length;
    const nearby = hazards.filter(
      (h) => haversineDistanceKm(userLocation, h.location) <= 5
    ).length;
    return { total, verified, pending, resolved, nearby };
  }, [hazards, userLocation]);

  const recentReports = useMemo(() => hazards.slice(0, 5), [hazards]);

  const safetyAlerts = useMemo(
    () =>
      hazards
        .filter(
          (h) =>
            (h.severity === 'Critical' || h.severity === 'High') &&
            h.status !== 'Resolved' &&
            h.status !== 'Rejected'
        )
        .slice(0, 4),
    [hazards]
  );

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    hazards.forEach((h) => {
      counts[h.category] = (counts[h.category] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name: name.replace(' Hazards', '').replace(' Issues', ''),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [hazards]);

  return (
    <SidebarLayout title="Community Safety Dashboard">
      <div className="mx-auto max-w-7xl space-y-6">
        {authCallbackNotice && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              {authCallbackNotice}
            </span>
            <button
              type="button"
              onClick={clearAuthCallbackMessages}
              className="shrink-0 text-xs font-semibold underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* 5 Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Total Hazards</span>
              <ShieldAlert size={15} className="text-[#2563EB]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-[#14213D] tabular-nums dark:text-white">
              {stats.total}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Verified Reports</span>
              <CheckCircle2 size={15} className="text-[#16A34A]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-[#16A34A] tabular-nums dark:text-emerald-400">
              {stats.verified}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Pending Reports</span>
              <Clock size={15} className="text-[#F97316]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-[#F97316] tabular-nums dark:text-orange-400">
              {stats.pending}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Resolved Reports</span>
              <Wrench size={15} className="text-[#2563EB]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-[#2563EB] tabular-nums dark:text-blue-400">
              {stats.resolved}
            </div>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Nearby Hazards</span>
              <Compass size={15} className="text-[#DC2626]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-[#DC2626] tabular-nums dark:text-red-400">
              {stats.nearby}
            </div>
          </div>
        </div>

        {/* Map + Safety Alerts Split */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                Nearby Hazard Map
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void detectUserLocation()}
                  disabled={gpsStatus === 'detecting'}
                  className="text-xs font-semibold text-[#2563EB] hover:underline disabled:opacity-60 dark:text-blue-400"
                >
                  {gpsStatus === 'detecting' ? 'Detecting GPS...' : 'Detect My GPS'}
                </button>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#2563EB] dark:text-slate-300"
                >
                  Full Map <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {gpsError && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <span>{gpsError}</span>
                <button
                  type="button"
                  onClick={() => void useApproximateLocation()}
                  className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                >
                  Use Approximate Location
                </button>
              </div>
            )}

            {gpsNotice && !gpsError && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{gpsNotice}</p>
            )}

            <MapView
              hazards={hazards.filter((h) => h.status !== 'Rejected')}
              center={userLocation}
              userLocation={userLocation}
              selectedHazard={selectedHazard}
              onSelectHazard={setSelectedHazard}
              heightClass="h-[380px]"
            />
          </div>

          {/* Safety Alerts */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                Active Safety Alerts
              </h2>
              <Link
                to="/notifications"
                className="text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                All Alerts
              </Link>
            </div>

            <div className="mt-4 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {safetyAlerts.map((alert) => {
                const sev = getSeverityColor(alert.severity);
                const dist = haversineDistanceKm(userLocation, alert.location);
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setSelectedHazard(alert)}
                    className="block w-full py-3 text-left transition-colors hover:bg-slate-50/70 first:pt-0 last:pb-0 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${sev.textClass}`}>
                        {alert.severity} · {alert.category}
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatDistance(dist)}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {alert.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {alert.address}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link
                to="/plan-journey"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#14213D] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-[#2563EB] dark:hover:bg-blue-700"
              >
                <Navigation size={14} />
                Plan Route Around Hazards
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Reports + Community Activity & Chart */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                Recent Reports
              </h2>
              <Link
                to="/nearby"
                className="text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                View Nearby Hazards →
              </Link>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {recentReports.map((report) => {
                const meta = getCategoryMeta(report.category);
                const statusColor = getStatusColor(report.status);
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        <CategoryIcon category={report.category} size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {report.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate">{report.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeDate(report.reportedAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {report.confirmations} confirmations
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`shrink-0 text-xs font-semibold ${statusColor}`}>
                      {report.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5">
            {/* Hazard Category Distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                Top Reported Categories
              </h2>
              <div className="mt-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Community Activity */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                  Community Activity
                </h2>
                <Link
                  to="/report"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                >
                  <AlertTriangle size={12} /> Report New
                </Link>
              </div>
              <ul className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                {notifications.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 font-medium text-slate-800 dark:text-slate-200">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-slate-400">
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};
