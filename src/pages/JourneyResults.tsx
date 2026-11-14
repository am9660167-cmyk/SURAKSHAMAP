import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Route,
  Upload,
  X,
} from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { ComputedRouteSummary, MapView } from '../components/MapView';
import { SidebarLayout } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';
import {
  Coordinates,
  HazardCategory,
  HazardReport,
  HazardSeverity,
} from '../types/safety';
import {
  formatRelativeDate,
  getCategoryMeta,
  getSeverityColor,
  getStatusColor,
  HAZARD_CATEGORIES,
  SEVERITY_OPTIONS,
} from '../utils/hazardHelpers';
import {
  distancePointToPolylineKm,
  formatCoords,
  formatDistance,
} from '../utils/location';

export const JourneyResults: React.FC = () => {
  const { user } = useAuth();
  const { journeyRequest, hazards, userLocation, addHazardReport } = useSafetyData();

  const [routes, setRoutes] = useState<ComputedRouteSummary[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [selectedHazard, setSelectedHazard] = useState<HazardReport | null>(null);

  // Click-anywhere-on-map quick report popup state
  const [reportCoords, setReportCoords] = useState<Coordinates | null>(null);
  const [quickCategory, setQuickCategory] =
    useState<HazardCategory>('Damaged Roads');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickSeverity, setQuickSeverity] = useState<HazardSeverity>('High');
  const [quickPhotoUrl, setQuickPhotoUrl] = useState<string | undefined>(undefined);
  const [quickError, setQuickError] = useState('');
  const [justReportedTitle, setJustReportedTitle] = useState<string | null>(null);

  const activeRoute = routes[selectedRouteIndex] ?? routes[0] ?? null;

  // Compute all hazards within 1.5 km of the selected route path
  const routeHazards = useMemo(() => {
    const activePath = activeRoute?.path ?? [
      journeyRequest.originCoords,
      journeyRequest.destinationCoords,
    ];
    return hazards
      .filter((h) => h.status !== 'Rejected' && h.status !== 'Resolved')
      .map((h) => ({
        hazard: h,
        distanceKm: distancePointToPolylineKm(h.location, activePath),
      }))
      .filter((item) => item.distanceKm <= 1.8)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [hazards, activeRoute, journeyRequest]);

  const counts = useMemo(() => {
    const critical = routeHazards.filter(
      (i) => i.hazard.severity === 'Critical'
    ).length;
    const high = routeHazards.filter((i) => i.hazard.severity === 'High').length;
    const other = routeHazards.length - critical - high;
    return {
      total: routeHazards.length,
      critical,
      high,
      other,
    };
  }, [routeHazards]);

  const selectedHazardDistance = useMemo(() => {
    if (!selectedHazard) return undefined;
    const match = routeHazards.find((r) => r.hazard.id === selectedHazard.id);
    return match?.distanceKm;
  }, [selectedHazard, routeHazards]);

  const handleQuickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setQuickPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportCoords) return;
    if (quickDescription.trim().length < 6) {
      setQuickError('Please add a brief description of the hazard.');
      return;
    }

    const created = addHazardReport({
      title: `${quickCategory} near route corridor`,
      category: quickCategory,
      description: quickDescription,
      severity: quickSeverity,
      location: reportCoords,
      address: `Route Corridor (${formatCoords(reportCoords)})`,
      photoUrl: quickPhotoUrl,
      reportedBy: user?.fullName ?? 'Route Contributor',
      reporterId: user?.id ?? 'guest-citizen',
    });

    setSelectedHazard(created);
    setJustReportedTitle(created.title);
    setReportCoords(null);
    setQuickDescription('');
    setQuickPhotoUrl(undefined);
    setQuickError('');
  };

  const midCenter: Coordinates = {
    lat:
      (journeyRequest.originCoords.lat + journeyRequest.destinationCoords.lat) /
      2,
    lng:
      (journeyRequest.originCoords.lng + journeyRequest.destinationCoords.lng) /
      2,
  };

  return (
    <SidebarLayout title="Journey Route & Hazard Analysis">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Top Journey Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[#2563EB] dark:text-blue-400">
                {journeyRequest.travelMode}
              </span>
              <span aria-hidden="true">·</span>
              <span>{journeyRequest.originLabel}</span>
              <span aria-hidden="true">→</span>
              <span>{journeyRequest.destinationLabel}</span>
            </div>
            {activeRoute && (
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-[#14213D] dark:text-white">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Route size={15} className="text-[#2563EB]" />
                  {(activeRoute.distanceMeters / 1000).toFixed(2)} km
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Clock size={15} className="text-[#2563EB]" />
                  {Math.max(1, Math.round(activeRoute.durationMillis / 60000))} mins
                </span>
              </div>
            )}
          </div>

          <Link
            to="/plan-journey"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={14} />
            Edit Journey
          </Link>
        </div>

        {justReportedTitle && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span className="inline-flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              Hazard added immediately to the route map: "{justReportedTitle}"
            </span>
            <button
              type="button"
              onClick={() => setJustReportedTitle(null)}
              className="font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Map + Side Panel */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <MapView
              hazards={routeHazards.map((r) => r.hazard)}
              center={midCenter}
              zoom={13}
              userLocation={userLocation}
              selectedHazard={selectedHazard}
              onSelectHazard={setSelectedHazard}
              routeOrigin={journeyRequest.originCoords}
              routeDestination={journeyRequest.destinationCoords}
              travelMode={journeyRequest.travelMode}
              selectedRouteIndex={selectedRouteIndex}
              onRoutesComputed={setRoutes}
              onMapClick={(coords) => {
                setReportCoords(coords);
                setQuickError('');
              }}
              heightClass="h-[520px]"
              interactiveHint="Click anywhere on the route map to report a new hazard at that spot"
            />

            {/* Selected Marker Detailed Inspector */}
            {selectedHazard && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{
                        backgroundColor: getCategoryMeta(selectedHazard.category).color,
                      }}
                    >
                      <CategoryIcon category={selectedHazard.category} size={16} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {selectedHazard.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            getSeverityColor(selectedHazard.severity).textClass
                          }`}
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
                      </div>
                      <h3 className="mt-0.5 text-base font-bold text-[#14213D] dark:text-white">
                        {selectedHazard.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHazard(null)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-12">
                  {selectedHazard.photoUrl && (
                    <div className="sm:col-span-4">
                      <img
                        src={selectedHazard.photoUrl}
                        alt={selectedHazard.title}
                        referrerPolicy="no-referrer"
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={
                      selectedHazard.photoUrl ? 'sm:col-span-8' : 'sm:col-span-12'
                    }
                  >
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {selectedHazard.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {selectedHazardDistance !== undefined && (
                        <span className="font-mono font-semibold text-[#2563EB] dark:text-blue-400">
                          {formatDistance(selectedHazardDistance)} from route
                        </span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>Reported {formatRelativeDate(selectedHazard.reportedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedHazard.confirmations} confirmations</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Panel */}
          <aside className="space-y-5 lg:col-span-4">
            {/* Route Selector */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold text-[#14213D] dark:text-white">
                Available Routes
              </h2>
              <div className="mt-3 space-y-2.5">
                {routes.length === 0 ? (
                  <p className="text-xs text-slate-500">Computing route options...</p>
                ) : (
                  routes.map((r) => {
                    const active = r.index === selectedRouteIndex;
                    return (
                      <button
                        key={r.index}
                        type="button"
                        onClick={() => setSelectedRouteIndex(r.index)}
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                          active
                            ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {r.label}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                            {(r.distanceMeters / 1000).toFixed(2)} km ·{' '}
                            {Math.max(1, Math.round(r.durationMillis / 60000))} mins
                          </div>
                        </div>
                        {active && (
                          <Navigation size={15} className="shrink-0 text-[#2563EB]" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Route Hazard Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold text-[#14213D] dark:text-white">
                Hazards Near Selected Route
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-[#F8FAFC] p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[11px] font-medium text-slate-500">
                    Total Near Route
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-[#14213D] tabular-nums dark:text-white">
                    {counts.total}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-[#F8FAFC] p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[11px] font-medium text-slate-500">
                    Critical Hazards
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-[#DC2626] tabular-nums dark:text-red-400">
                    {counts.critical}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-[#F8FAFC] p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[11px] font-medium text-slate-500">
                    High Severity
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-[#F97316] tabular-nums dark:text-orange-400">
                    {counts.high}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-[#F8FAFC] p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[11px] font-medium text-slate-500">
                    Other Hazards
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-slate-700 tabular-nums dark:text-slate-300">
                    {counts.other}
                  </div>
                </div>
              </div>

              <div className="mt-4 max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {routeHazards.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500">
                    No active hazards reported along this route corridor.
                  </p>
                ) : (
                  routeHazards.map(({ hazard, distanceKm }) => {
                    const meta = getCategoryMeta(hazard.category);
                    const sev = getSeverityColor(hazard.severity);
                    return (
                      <button
                        key={hazard.id}
                        type="button"
                        onClick={() => setSelectedHazard(hazard)}
                        className="flex w-full items-start gap-2.5 py-3 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          <CategoryIcon category={hazard.category} size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className={`font-semibold ${sev.textClass}`}>
                              {hazard.severity}
                            </span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              {formatDistance(distanceKm)} away
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-xs font-semibold text-slate-900 dark:text-white">
                            {hazard.title}
                          </div>
                          <div className="truncate text-[11px] text-slate-500">
                            {hazard.category} · {hazard.status}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <strong>Safety Advisory:</strong> Community hazard listings help inform
                your trip planning. No route is guaranteed safe—stay alert to live road
                and weather conditions.
              </div>
            </div>
          </aside>
        </div>

        {/* Click-on-Map Reporting Popup Modal */}
        {reportCoords && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#14213D] dark:text-white">
                    Report Hazard on Route Map
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    Location: {formatCoords(reportCoords)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportCoords(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleQuickReportSubmit} className="mt-4 space-y-4">
                {quickError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                    {quickError}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Hazard Category
                  </label>
                  <select
                    value={quickCategory}
                    onChange={(e) =>
                      setQuickCategory(e.target.value as HazardCategory)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {HAZARD_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Severity
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SEVERITY_OPTIONS.map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setQuickSeverity(sev)}
                        className={`rounded-lg border py-1.5 text-xs font-semibold ${
                          quickSeverity === sev
                            ? 'border-[#2563EB] bg-[#2563EB] text-white'
                            : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={quickDescription}
                    onChange={(e) => setQuickDescription(e.target.value)}
                    placeholder="Describe the hazard at this point on the route..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Photograph (optional)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 hover:border-blue-500 dark:border-slate-700 dark:text-slate-300">
                    <Upload size={14} />
                    <span>{quickPhotoUrl ? 'Photo attached (click to change)' : 'Attach photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQuickPhoto}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950">
                  <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <MapPin size={13} className="text-[#2563EB]" />
                    Confirm Location
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {formatCoords(reportCoords)}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReportCoords(null)}
                    className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <AlertTriangle size={14} />
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};
