import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ShieldAlert } from 'lucide-react';
import { SidebarLayout } from '../components/Sidebar';
import { useSafetyData } from '../context/SafetyDataContext';
import { NotificationType } from '../types/safety';
import { formatRelativeDate } from '../utils/hazardHelpers';

export const Notifications: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } =
    useSafetyData();
  const [filterType, setFilterType] = useState<NotificationType | 'All'>('All');

  const types: Array<NotificationType | 'All'> = [
    'All',
    'Critical Hazard Alert',
    'Nearby Hazard Alert',
    'New Report',
    'Verified Report',
    'Resolved Report',
  ];

  const visible = useMemo(() => {
    if (filterType === 'All') return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  return (
    <SidebarLayout title="Notifications">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  filterType === t
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <CheckCheck size={14} />
            Mark All Read
          </button>
        </div>

        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No notifications in this category.
            </div>
          ) : (
            visible.map((notif) => (
              <div
                key={notif.id}
                className={`flex flex-wrap items-start justify-between gap-4 p-5 transition-colors ${
                  !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      notif.type === 'Critical Hazard Alert'
                        ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                        : notif.type === 'Verified Report'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    }`}
                  >
                    {notif.type === 'Critical Hazard Alert' ? (
                      <ShieldAlert size={17} />
                    ) : (
                      <Bell size={17} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {notif.type}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeDate(notif.createdAt)}</span>
                      {!notif.read && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#2563EB] dark:text-blue-400">
                            Unread
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {notif.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.hazardId && (
                    <Link
                      to="/explore"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      View Map
                    </Link>
                  )}
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(notif.id)}
                      className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};
