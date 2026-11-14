import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  MapPin,
  ShieldCheck,
  Users,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import { HazardReport, ReportStatus } from '../types/safety';
import {
  formatRelativeDate,
  getCategoryMeta,
  getSeverityColor,
  getStatusColor,
} from '../utils/hazardHelpers';

export const AdminDashboard: React.FC = () => {
  const { allUsersCount } = useAuth();
  const { hazards, updateHazardStatus, userLocation } = useSafetyData();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [photoModalHazard, setPhotoModalHazard] = useState<HazardReport | null>(
    null
  );
  const [mapModalHazard, setMapModalHazard] = useState<HazardReport | null>(null);

  const metrics = useMemo(() => {
    const total = hazards.length;
    const pending = hazards.filter((h) => h.status === 'Pending').length;
    const verified = hazards.filter((h) => h.status === 'Verified').length;
    const rejected = hazards.filter((h) => h.status === 'Rejected').length;
    const resolved = hazards.filter((h) => h.status === 'Resolved').length;
    return { total, pending, verified, rejected, resolved };
  }, [hazards]);

  const statusChartData = [
    { name: 'Verified', value: metrics.verified, color: '#16A34A' },
    { name: 'Pending', value: metrics.pending, color: '#F97316' },
    { name: 'Resolved', value: metrics.resolved, color: '#2563EB' },
    { name: 'Rejected', value: metrics.rejected, color: '#DC2626' },
  ];

  const categoryAnalytics = useMemo(() => {
    const map: Record<string, number> = {};
    hazards.forEach((h) => {
      map[h.category] = (map[h.category] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, reports]) => ({
        name: name.split(' ').slice(0, 2).join(' '),
        reports,
      }))
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 7);
  }, [hazards]);

  const filteredReports = useMemo(() => {
    if (statusFilter === 'All') return hazards;
    return hazards.filter((h) => h.status === statusFilter);
  }, [hazards, statusFilter]);

  return (
    <SidebarLayout title="Admin Moderation & Analytics">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500">Total Reports</div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-[#14213D] tabular-nums dark:text-white">
              {metrics.total}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500">Pending</div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-[#F97316] tabular-nums dark:text-orange-400">
              {metrics.pending}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500">Verified</div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-[#16A34A] tabular-nums dark:text-emerald-400">
              {metrics.verified}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500">Rejected</div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-[#DC2626] tabular-nums dark:text-red-400">
              {metrics.rejected}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500">Resolved</div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-[#2563EB] tabular-nums dark:text-blue-400">
              {metrics.resolved}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Active Users</span>
              <Users size={14} className="text-[#2563EB]" />
            </div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-[#14213D] tabular-nums dark:text-white">
              {allUsersCount}
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-[#14213D] dark:text-white">
              Report Volume by Category
            </h2>
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryAnalytics}
                  margin={{ top: 5, right: 12, left: -24, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="reports" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-[#14213D] dark:text-white">
              Moderation Status Split
            </h2>
            <div className="mt-4 flex h-56 items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] space-y-2 text-xs">
                {statusChartData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                    <span className="font-mono font-bold tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Moderation Table */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                Hazard Moderation Queue
              </h2>
            </div>

            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(['All', 'Pending', 'Verified', 'Resolved', 'Rejected'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <th className="px-4 py-3 font-semibold">Hazard</th>
                  <th className="px-4 py-3 font-semibold">Severity</th>
                  <th className="px-4 py-3 font-semibold">Reporter & Date</th>
                  <th className="px-4 py-3 font-semibold">Trust / Confirms</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReports.map((report) => {
                  const meta = getCategoryMeta(report.category);
                  const sev = getSeverityColor(report.severity);
                  const statusClass = getStatusColor(report.status);
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                            style={{ backgroundColor: meta.color }}
                          >
                            <CategoryIcon category={report.category} size={13} />
                          </span>
                          <div className="max-w-xs">
                            <div className="truncate font-semibold text-slate-900 dark:text-white">
                              {report.title}
                            </div>
                            <div className="truncate text-[11px] text-slate-500">
                              {report.category} · {report.address}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3.5 font-semibold ${sev.textClass}`}>
                        {report.severity}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <div>{report.reportedBy}</div>
                        <div className="text-[11px] text-slate-400">
                          {formatRelativeDate(report.reportedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {report.trustScore}% · {report.confirmations}
                      </td>
                      <td className={`px-4 py-3.5 font-bold ${statusClass}`}>
                        {report.status}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {report.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setPhotoModalHazard(report)}
                              title="View Photograph"
                              className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setMapModalHazard(report)}
                            title="View Location on Map"
                            className="rounded border border-slate-200 p-1.5 text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
                          >
                            <MapPin size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateHazardStatus(report.id, 'Verified')}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 size={11} />
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => updateHazardStatus(report.id, 'Resolved')}
                            className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                          >
                            <Wrench size={11} />
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateHazardStatus(report.id, 'Rejected')}
                            className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                          >
                            <XCircle size={11} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Photograph Inspector Modal */}
        {photoModalHazard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {photoModalHazard.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setPhotoModalHazard(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
              {photoModalHazard.photoUrl && (
                <img
                  src={photoModalHazard.photoUrl}
                  alt={photoModalHazard.title}
                  referrerPolicy="no-referrer"
                  className="mt-3 max-h-80 w-full rounded-xl object-cover"
                />
              )}
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                {photoModalHazard.description}
              </p>
            </div>
          </div>
        )}

        {/* Map Location Modal */}
        {mapModalHazard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {mapModalHazard.title}
                  </h3>
                  <p className="text-xs text-slate-500">{mapModalHazard.address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMapModalHazard(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
              <MapView
                hazards={[mapModalHazard]}
                center={mapModalHazard.location}
                zoom={15}
                userLocation={userLocation}
                selectedHazard={mapModalHazard}
                heightClass="h-[340px]"
                showConfigNotice={false}
              />
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};
