import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Compass,
  Crosshair,
  MapPin,
  Navigation,
  Route,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ComputedRouteSummary, MapView } from '../components/MapView';
import { SidebarLayout } from '../components/Sidebar';
import { useSafetyData } from '../context/SafetyDataContext';
import { HazardReport, NotificationItem, NotificationType } from '../types/safety';
import {
  formatRelativeDate,
  getSeverityColor,
  getStatusColor,
} from '../utils/hazardHelpers';
import {
  calculateBearingDegrees,
  formatCoords,
  formatDistance,
  haversineDistanceKm,
} from '../utils/location';

function getCardinalDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

export const Notifications: React.FC = () => {
  const {
    hazards,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    userLocation,
    hasDetectedGps,
    gpsStatus,
    gpsSource,
    gpsNotice,
    gpsError,
    detectUserLocation,
    useApproximateLocation,
  } = useSafetyData();

  const [filterType, setFilterType] = useState<NotificationType | 'All'>('All');
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [routeSummary, setRouteSummary] = useState<ComputedRouteSummary | null>(null);

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

  const resolveHazardForNotification = (
    notif: NotificationItem
  ): HazardReport | null => {
    if (notif.hazardId) {
      const byId = hazards.find((h) => h.id === notif.hazardId);
      if (byId) return byId;
    }
    const lowerMsg = `${notif.title} ${notif.message}`.toLowerCase();
    return (
      hazards.find(
        (h) =>
          lowerMsg.includes(h.title.toLowerCase()) ||
          lowerMsg.includes(h.address.toLowerCase())
      ) ?? null
    );
  };

  const selectedHazard = useMemo(
    () => (selectedNotif ? resolveHazardForNotification(selectedNotif) : null),
    [selectedNotif, hazards]
  );

  useEffect(() => {
    if (!selectedNotif) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNotif(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNotif]);

  const handleViewDistance = (notif: NotificationItem) => {
    setRouteSummary(null);
    setSelectedNotif(notif);
    if (!hasDetectedGps && gpsStatus !== 'detecting' && gpsStatus !== 'denied') {
      void detectUserLocation();
    }
  };

  const straightLineKm = selectedHazard
    ? haversineDistanceKm(userLocation, selectedHazard.location)
    : null;
  const bearingDeg = selectedHazard
    ? calculateBearingDegrees(userLocation, selectedHazard.location)
    : null;

  return (
    <SidebarLayout title="Notifications">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Admin / User Live Location Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 text-xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400">
              <MapPin size={15} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {hasDetectedGps
                  ? gpsSource === 'gps'
                    ? 'Your Live GPS Location'
                    : 'Your Approximate Location'
                  : 'Default Reference Location'}
              </div>
              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {formatCoords(userLocation)}
                {gpsNotice && !gpsError ? ` · ${gpsNotice}` : ''}
              </div>
              {gpsError && (
                <div className="mt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  {gpsError}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void detectUserLocation()}
              disabled={gpsStatus === 'detecting'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Crosshair size={13} />
              {gpsStatus === 'detecting' ? 'Detecting GPS...' : 'Detect My Location'}
            </button>
            {!hasDetectedGps && (
              <button
                type="button"
                onClick={() => void useApproximateLocation()}
                disabled={gpsStatus === 'detecting'}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Use Approx. Location
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
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

        {/* Notifications List */}
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No notifications in this category.
            </div>
          ) : (
            visible.map((notif) => {
              const linkedHazard = resolveHazardForNotification(notif);
              const liveDistanceLabel = linkedHazard
                ? formatDistance(haversineDistanceKm(userLocation, linkedHazard.location))
                : null;

              return (
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
                        {liveDistanceLabel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-[#2563EB] dark:text-blue-400">
                              {liveDistanceLabel} away
                            </span>
                          </>
                        )}
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

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleViewDistance(notif)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950"
                    >
                      <Navigation size={13} />
                      View Distance
                    </button>
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
              );
            })
          )}
        </div>
      </div>

      {/* Distance Inspector Modal */}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-[#2563EB] dark:text-blue-400">
                    Hazard Distance Monitor
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedNotif.type}</span>
                  {selectedHazard && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${getSeverityColor(
                          selectedHazard.severity
                        ).textClass}`}
                      >
                        {selectedHazard.severity}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${getStatusColor(
                          selectedHazard.status
                        )}`}
                      >
                        {selectedHazard.status}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 text-base font-bold text-[#14213D] dark:text-white">
                  {selectedHazard?.title ?? selectedNotif.title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {selectedHazard?.address ?? selectedNotif.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                aria-label="Close distance monitor"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {selectedHazard && straightLineKm !== null && bearingDeg !== null ? (
              <div className="space-y-4 p-5">
                {/* Telemetry Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <Compass size={13} className="text-[#2563EB]" />
                      Straight-Line Distance
                    </div>
                    <div className="mt-1 font-mono text-xl font-bold text-[#14213D] dark:text-white">
                      {formatDistance(straightLineKm)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Bearing {Math.round(bearingDeg)}° ({getCardinalDirection(bearingDeg)})
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <Route size={13} className="text-emerald-600" />
                      Road Route Distance
                    </div>
                    <div className="mt-1 font-mono text-xl font-bold text-[#14213D] dark:text-white">
                      {routeSummary
                        ? formatDistance(routeSummary.distanceMeters / 1000)
                        : 'Calculating...'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {routeSummary
                        ? `Approx. ${Math.max(
                            1,
                            Math.round(routeSummary.durationMillis / 60000)
                          )} min travel`
                        : 'Fetching street route...'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <MapPin size={13} className="text-blue-600" />
                        Your Location
                      </span>
                      <button
                        type="button"
                        onClick={() => void detectUserLocation()}
                        disabled={gpsStatus === 'detecting'}
                        className="text-[11px] font-semibold text-[#2563EB] hover:underline disabled:opacity-60 dark:text-blue-400"
                      >
                        {gpsStatus === 'detecting' ? 'Updating...' : 'Update GPS'}
                      </button>
                    </div>
                    <div className="mt-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {formatCoords(userLocation)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Hazard: <span className="font-mono">{formatCoords(selectedHazard.location)}</span>
                    </div>
                  </div>
                </div>

                {/* Live Map Showing Admin Location -> Hazard */}
                <MapView
                  hazards={hazards}
                  center={selectedHazard.location}
                  zoom={13}
                  heightClass="h-[340px]"
                  userLocation={userLocation}
                  selectedHazard={selectedHazard}
                  routeOrigin={userLocation}
                  routeDestination={selectedHazard.location}
                  travelMode="DRIVING"
                  onRoutesComputed={(routes) => setRouteSummary(routes[0] ?? null)}
                  allowResolvedPin
                  interactiveHint="Blue cursor shows your location; dashed/solid line shows route distance to the hazard."
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Reported {formatRelativeDate(selectedHazard.reportedAt)} by{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedHazard.reportedBy}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Open Admin Moderation
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelectedNotif(null)}
                      className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-6">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  This hazard report has already been resolved and removed from the live
                  map, so active hazard coordinates are no longer available for distance
                  tracking.
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Your Current Location
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {formatCoords(userLocation)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void detectUserLocation()}
                    disabled={gpsStatus === 'detecting'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Crosshair size={13} />
                    {gpsStatus === 'detecting' ? 'Detecting GPS...' : 'Update My GPS'}
                  </button>
                </div>

                <div className="flex justify-end gap-2">
                  <Link
                    to="/explore"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Open Live Map
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedNotif(null)}
                    className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};
