import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, MapPin, Trash2 } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { SidebarLayout } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';
import { ReportStatus } from '../types/safety';
import {
  formatRelativeDate,
  getCategoryMeta,
  getSeverityColor,
  getStatusColor,
} from '../utils/hazardHelpers';
import { formatCoords } from '../utils/location';

export const MyReports: React.FC = () => {
  const { user } = useAuth();
  const { hazards, deleteHazardReport } = useSafetyData();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  const actorId = user?.id ?? 'user-demo-1';

  const userReports = useMemo(() => {
    const mine = hazards.filter(
      (h) => h.reporterId === actorId || h.reporterId === 'guest-citizen'
    );
    if (statusFilter === 'All') return mine;
    return mine.filter((h) => h.status === statusFilter);
  }, [hazards, actorId, statusFilter]);

  const statuses: Array<ReportStatus | 'All'> = [
    'All',
    'Pending',
    'Verified',
    'Resolved',
    'Rejected',
  ];

  return (
    <SidebarLayout title="My Reports">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {statuses.map((st) => (
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
            ))}
          </div>

          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <AlertTriangle size={14} />
            Submit New Report
          </Link>
        </div>

        {deletedMessage && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <span>{deletedMessage}</span>
            <button
              type="button"
              onClick={() => setDeletedMessage(null)}
              className="font-semibold text-[#2563EB] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {userReports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No reports found in "{statusFilter}" status.
            </p>
            <Link
              to="/report"
              className="mt-4 inline-block rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
            >
              Report a Hazard
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {userReports.map((report) => {
              const meta = getCategoryMeta(report.category);
              const sev = getSeverityColor(report.severity);
              const statusColor = getStatusColor(report.status);
              return (
                <article
                  key={report.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  {report.photoUrl && (
                    <img
                      src={report.photoUrl}
                      alt={report.title}
                      referrerPolicy="no-referrer"
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          <CategoryIcon category={report.category} size={13} />
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {report.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-semibold ${sev.textClass}`}>
                          {report.severity}
                        </span>
                      </div>
                      <span className={`font-bold ${statusColor}`}>{report.status}</span>
                    </div>

                    <h2 className="mt-2 text-base font-bold text-[#14213D] dark:text-white">
                      {report.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {report.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} />
                        {report.address}
                      </span>
                      <span className="font-mono">
                        {formatCoords(report.location)} ·{' '}
                        {formatRelativeDate(report.reportedAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                      {confirmDeleteId === report.id ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Delete this report?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void deleteHazardReport(report.id).then(() => {
                                setConfirmDeleteId(null);
                                setDeletedMessage(`Deleted "${report.title}".`);
                              });
                            }}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(report.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                        >
                          <Trash2 size={13} />
                          Delete Report
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};
