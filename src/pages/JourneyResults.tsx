import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Compass,
  Crosshair,
  MapPin,
  Navigation,
  Play,
  Route,
  ShieldCheck,
  Square,
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
  calculateBearingDegrees,
  distancePointToPolylineKm,
  evaluateRouteHazards,
  formatCoords,
  formatDistance,
  haversineDistanceKm,
  interpolateAlongPolyline,
} from '../utils/location';

type NavigationMode = 'idle' | 'gps' | 'sim';

export const JourneyResults: React.FC = () => {
  const { user } = useAuth();
  const {
    journeyRequest,
    hazards,
    userLocation,
    addHazardReport,
    setLiveUserLocation,
  } = useSafetyData();

  const [routes, setRoutes] = useState<ComputedRouteSummary[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [selectedHazard, setSelectedHazard] = useState<HazardReport | null>(null);
  const [dismissedForRouteIndex, setDismissedForRouteIndex] = useState<number | null>(null);
  const [routeChoiceFeedback, setRouteChoiceFeedback] = useState<string | null>(null);

  // Live Navigation Cursor State (starts at starting position)
  const [navMode, setNavMode] = useState<NavigationMode>('idle');
  const [cursorPosition, setCursorPosition] = useState<Coordinates>(
    journeyRequest.originCoords
  );
  const [cursorHeading, setCursorHeading] = useState<number | null>(null);
  const [followCursor, setFollowCursor] = useState(true);
  const [alignToHeading, setAlignToHeading] = useState(false);
  const [navNote, setNavNote] = useState<string | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const lastGpsCoordsRef = useRef<Coordinates | null>(null);
  const simProgressRef = useRef<number>(0);

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
  const isNavigating = navMode !== 'idle';

  // Reset route choice prompt when origin/destination/mode changes
  useEffect(() => {
    setSelectedRouteIndex(0);
    setDismissedForRouteIndex(null);
    setRouteChoiceFeedback(null);
  }, [
    journeyRequest.originCoords.lat,
    journeyRequest.originCoords.lng,
    journeyRequest.destinationCoords.lat,
    journeyRequest.destinationCoords.lng,
    journeyRequest.travelMode,
  ]);

  // Reset cursor to starting position whenever journey origin changes while idle
  useEffect(() => {
    if (navMode === 'idle') {
      setCursorPosition(journeyRequest.originCoords);
      const path = activeRoute?.path ?? [];
      if (path.length >= 2) {
        setCursorHeading(calculateBearingDegrees(path[0], path[1]));
      } else {
        setCursorHeading(
          calculateBearingDegrees(
            journeyRequest.originCoords,
            journeyRequest.destinationCoords
          )
        );
      }
      setHasArrived(false);
    }
  }, [
    journeyRequest.originCoords.lat,
    journeyRequest.originCoords.lng,
    journeyRequest.destinationCoords.lat,
    journeyRequest.destinationCoords.lng,
    activeRoute,
    navMode,
  ]);

  const stopGpsWatch = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const stopNavigation = (resetToStart = true) => {
    stopGpsWatch();
    setNavMode('idle');
    setNavNote(null);
    setHasArrived(false);
    simProgressRef.current = 0;
    setSimProgress(0);
    lastGpsCoordsRef.current = null;
    if (resetToStart) {
      setCursorPosition(journeyRequest.originCoords);
    }
  };

  const startLiveGpsJourney = () => {
    stopGpsWatch();
    setHasArrived(false);
    setFollowCursor(true);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      simProgressRef.current = 0;
      setSimProgress(0);
      setNavMode('sim');
      setNavNote('Browser GPS is unavailable; running route movement preview along your path.');
      return;
    }

    setNavMode('gps');
    setNavNote('Tracking your live GPS location as you move toward your destination...');
    lastGpsCoordsRef.current = cursorPosition;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nextCoords: Coordinates = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };

        const prev = lastGpsCoordsRef.current;
        if (typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)) {
          setCursorHeading(pos.coords.heading);
        } else if (prev && haversineDistanceKm(prev, nextCoords) > 0.003) {
          setCursorHeading(calculateBearingDegrees(prev, nextCoords));
        }

        lastGpsCoordsRef.current = nextCoords;
        setCursorPosition(nextCoords);
        setLiveUserLocation(nextCoords, 'gps');
        setNavNote('Live GPS cursor active — moving with your current location.');

        if (haversineDistanceKm(nextCoords, journeyRequest.destinationCoords) <= 0.05) {
          setHasArrived(true);
          setNavNote('You have arrived near your destination.');
        }
      },
      (err) => {
        const msg = (err.message || '').toLowerCase();
        const blocked =
          msg.includes('permissions policy') ||
          msg.includes('disabled') ||
          err.code === 1;
        setNavNote(
          blocked
            ? 'Live GPS is restricted or denied in this browser preview. Click "Simulate Move" to move the cursor along the route.'
            : 'Waiting for GPS movement signal. You can also click "Simulate Move" to preview travel along the route.'
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1500,
        timeout: 10000,
      }
    );
  };

  const startSimulatedJourney = () => {
    stopGpsWatch();
    setHasArrived(false);
    setFollowCursor(true);
    simProgressRef.current = 0;
    setSimProgress(0);
    setNavMode('sim');
    setNavNote('Moving cursor along your planned route from start to destination.');
  };

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      stopGpsWatch();
    };
  }, []);

  // Animate cursor smoothly along route polyline during simulation mode
  useEffect(() => {
    if (navMode !== 'sim') return;
    const routePath =
      activeRoute?.path && activeRoute.path.length >= 2
        ? activeRoute.path
        : [journeyRequest.originCoords, journeyRequest.destinationCoords];

    const stepMs = 350;
    const stepProgress = 0.015;

    const timer = window.setInterval(() => {
      const next = Math.min(1, simProgressRef.current + stepProgress);
      simProgressRef.current = next;
      const sample = interpolateAlongPolyline(routePath, next);
      setSimProgress(next);
      setCursorPosition(sample.coords);
      setCursorHeading(sample.heading);
      setLiveUserLocation(sample.coords, 'gps');

      if (next >= 1) {
        window.clearInterval(timer);
        setHasArrived(true);
        setNavNote('Arrived at destination!');
      }
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [navMode, activeRoute, journeyRequest.originCoords, journeyRequest.destinationCoords]);

  const activeHazards = useMemo(
    () => hazards.filter((h) => h.status !== 'Rejected' && h.status !== 'Resolved'),
    [hazards]
  );

  // Compute all hazards within 1.8 km of the selected route path
  const routeHazards = useMemo(() => {
    const activePath = activeRoute?.path ?? [
      journeyRequest.originCoords,
      journeyRequest.destinationCoords,
    ];
    return activeHazards
      .map((h) => ({
        hazard: h,
        distanceKm: distancePointToPolylineKm(h.location, activePath),
      }))
      .filter((item) => item.distanceKm <= 1.8)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [activeHazards, activeRoute, journeyRequest]);

  // Evaluate every computed route option for on-path & corridor hazards
  const evaluatedRoutes = useMemo(() => {
    return routes.map((route) => ({
      route,
      eval: evaluateRouteHazards(route.path, activeHazards, 0.35, 1.5),
    }));
  }, [routes, activeHazards]);

  const currentRouteEval =
    evaluatedRoutes.find((item) => item.route.index === selectedRouteIndex) ??
    evaluatedRoutes[0] ??
    null;

  const currentHasHazards =
    (currentRouteEval?.eval.onRouteCount ?? 0) > 0 || routeHazards.length > 0;

  // Suggest the shortest safer alternative route (optional — user chooses whether to switch)
  const recommendedSafeRoute = useMemo(() => {
    if (!currentRouteEval || evaluatedRoutes.length <= 1) return null;
    const cur = currentRouteEval.eval;
    if (cur.onRouteCount === 0 && cur.corridorCount === 0 && routeHazards.length === 0) {
      return null;
    }

    const saferCandidates = evaluatedRoutes.filter((item) => {
      if (item.route.index === currentRouteEval.route.index) return false;
      const cand = item.eval;
      return (
        cand.onRouteCount < cur.onRouteCount ||
        (cand.onRouteCount === cur.onRouteCount && cand.riskScore < cur.riskScore) ||
        (cand.onRouteCount === cur.onRouteCount &&
          cand.riskScore === cur.riskScore &&
          cand.corridorCount < cur.corridorCount)
      );
    });

    if (saferCandidates.length === 0) return null;

    const zeroOnRoute = saferCandidates.filter((c) => c.eval.onRouteCount === 0);
    const pool = zeroOnRoute.length > 0 ? zeroOnRoute : saferCandidates;

    return [...pool].sort((a, b) => {
      if (a.route.distanceMeters !== b.route.distanceMeters) {
        return a.route.distanceMeters - b.route.distanceMeters;
      }
      return a.eval.riskScore - b.eval.riskScore;
    })[0];
  }, [currentRouteEval, evaluatedRoutes, routeHazards.length]);

  const handleSelectRoute = (index: number, feedback?: string) => {
    setSelectedRouteIndex(index);
    setDismissedForRouteIndex(null);
    if (navMode === 'sim') {
      simProgressRef.current = 0;
      setSimProgress(0);
    }
    if (feedback) {
      setRouteChoiceFeedback(feedback);
    } else {
      setRouteChoiceFeedback(null);
    }
  };

  // Nearest active hazard ahead/near the moving cursor (within 500 m)
  const nearbyCursorHazard = useMemo(() => {
    if (!isNavigating || routeHazards.length === 0) return null;
    let closest: { hazard: HazardReport; distanceKm: number } | null = null;
    for (const item of routeHazards) {
      const dist = haversineDistanceKm(cursorPosition, item.hazard.location);
      if (dist <= 0.5 && (!closest || dist < closest.distanceKm)) {
        closest = { hazard: item.hazard, distanceKm: dist };
      }
    }
    return closest;
  }, [isNavigating, routeHazards, cursorPosition]);

  const remainingDistanceKm = useMemo(() => {
    return haversineDistanceKm(cursorPosition, journeyRequest.destinationCoords);
  }, [cursorPosition, journeyRequest.destinationCoords]);

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

  const handleQuickReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportCoords) return;
    if (quickDescription.trim().length < 6) {
      setQuickError('Please add a brief description of the hazard.');
      return;
    }

    try {
      const created = await addHazardReport({
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
    } catch (err) {
      setQuickError(
        err instanceof Error ? err.message : 'Unable to save hazard report.'
      );
    }
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

          <div className="flex flex-wrap items-center gap-2">
            {!isNavigating ? (
              <>
                <button
                  type="button"
                  onClick={startLiveGpsJourney}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Navigation size={14} />
                  Start Journey
                </button>
                <button
                  type="button"
                  onClick={startSimulatedJourney}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  <Play size={13} />
                  Simulate Move
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFollowCursor((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    followCursor
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-400'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Crosshair size={13} />
                  {followCursor ? 'Following Cursor' : 'Follow Cursor'}
                </button>
                {navMode === 'gps' ? (
                  <button
                    type="button"
                    onClick={startSimulatedJourney}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Play size={13} />
                    Simulate Move
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startLiveGpsJourney}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Compass size={13} />
                    Switch to Live GPS
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => stopNavigation(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <Square size={12} />
                  Stop
                </button>
              </>
            )}

            <Link
              to="/plan-journey"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={14} />
              Edit Journey
            </Link>
          </div>
        </div>

        {/* Live Cursor Navigation Telemetry Banner */}
        {isNavigating && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs dark:border-blue-900 dark:bg-blue-950/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-[#14213D] dark:text-white">
                  {hasArrived
                    ? 'Destination Reached'
                    : navMode === 'gps'
                    ? 'Live GPS Navigation Active'
                    : 'Route Cursor Simulation Active'}
                </span>
                {navNote && (
                  <span className="text-slate-600 dark:text-slate-300">
                    — {navNote}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                <span>Cursor: {formatCoords(cursorPosition)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#2563EB] dark:text-blue-400">
                  {formatDistance(remainingDistanceKm)} to destination
                </span>
                {navMode === 'sim' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{Math.round(simProgress * 100)}%</span>
                  </>
                )}
              </div>
            </div>

            {nearbyCursorHazard && (
              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <span className="inline-flex items-center gap-2 font-medium">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Approaching {nearbyCursorHazard.hazard.severity} Hazard:</strong>{' '}
                    {nearbyCursorHazard.hazard.title} ({formatDistance(nearbyCursorHazard.distanceKm)} away)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedHazard(nearbyCursorHazard.hazard)}
                  className="shrink-0 font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                >
                  Inspect
                </button>
              </div>
            )}
          </div>
        )}

        {/* Optional Shorter Safe Alternative Route Banner (User Choice) */}
        {currentHasHazards &&
          recommendedSafeRoute &&
          currentRouteEval &&
          dismissedForRouteIndex !== selectedRouteIndex && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      <ShieldCheck size={12} />
                      Optional Safe Alternative
                    </span>
                    <span className="text-xs font-bold text-[#14213D] dark:text-white">
                      Hazard detected on {currentRouteEval.route.label} — shorter safe route suggested
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {currentRouteEval.eval.onRouteCount > 0 ? (
                      <>
                        Your current path passes{' '}
                        <strong className="text-red-700 dark:text-red-400">
                          {currentRouteEval.eval.onRouteCount}{' '}
                          {currentRouteEval.eval.onRouteCount === 1 ? 'hazard' : 'hazards'}
                        </strong>
                        .{' '}
                      </>
                    ) : (
                      <>
                        Your current corridor has{' '}
                        <strong className="text-amber-700 dark:text-amber-400">
                          {routeHazards.length} nearby{' '}
                          {routeHazards.length === 1 ? 'hazard' : 'hazards'}
                        </strong>
                        .{' '}
                      </>
                    )}
                    <strong className="text-emerald-800 dark:text-emerald-300">
                      {recommendedSafeRoute.route.label}
                    </strong>{' '}
                    is{' '}
                    <span className="font-mono font-semibold">
                      {(recommendedSafeRoute.route.distanceMeters / 1000).toFixed(2)} km
                    </span>{' '}
                    (
                    {(() => {
                      const diffKm =
                        (recommendedSafeRoute.route.distanceMeters -
                          currentRouteEval.route.distanceMeters) /
                        1000;
                      if (Math.abs(diffKm) < 0.05) return 'similar distance';
                      return diffKm > 0
                        ? `+${diffKm.toFixed(2)} km detour`
                        : `${Math.abs(diffKm).toFixed(2)} km shorter`;
                    })()}
                    ,{' '}
                    {Math.max(
                      1,
                      Math.round(recommendedSafeRoute.route.durationMillis / 60000)
                    )}{' '}
                    mins) with{' '}
                    <strong className="text-emerald-800 dark:text-emerald-300">
                      {recommendedSafeRoute.eval.onRouteCount === 0
                        ? '0 hazards on path'
                        : `${recommendedSafeRoute.eval.onRouteCount} hazard(s) on path`}
                    </strong>
                    . You can choose whether to switch or stay.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectRoute(
                        recommendedSafeRoute.route.index,
                        `Switched to optional safe route "${recommendedSafeRoute.route.label}" (${(
                          recommendedSafeRoute.route.distanceMeters / 1000
                        ).toFixed(2)} km).`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <ShieldCheck size={14} />
                    Switch to Safe Route
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDismissedForRouteIndex(selectedRouteIndex);
                      setRouteChoiceFeedback(
                        `Keeping "${currentRouteEval.route.label}". You can still switch to the green dashed safe route anytime.`
                      );
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Keep Current Route
                  </button>
                </div>
              </div>
            </div>
          )}

        {routeChoiceFeedback && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="inline-flex items-center gap-2 font-medium">
              <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
              {routeChoiceFeedback}
            </span>
            <button
              type="button"
              onClick={() => setRouteChoiceFeedback(null)}
              className="font-semibold text-slate-500 hover:underline dark:text-slate-400"
            >
              Dismiss
            </button>
          </div>
        )}

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
              hazards={activeHazards}
              center={midCenter}
              zoom={13}
              userLocation={userLocation}
              selectedHazard={selectedHazard}
              onSelectHazard={setSelectedHazard}
              routeOrigin={journeyRequest.originCoords}
              routeDestination={journeyRequest.destinationCoords}
              travelMode={journeyRequest.travelMode}
              selectedRouteIndex={selectedRouteIndex}
              recommendedSafeRouteIndex={
                currentHasHazards && recommendedSafeRoute
                  ? recommendedSafeRoute.route.index
                  : null
              }
              onSelectRoute={(idx) => handleSelectRoute(idx)}
              onRoutesComputed={setRoutes}
              navigationPosition={cursorPosition}
              navigationHeading={cursorHeading}
              isNavigating={isNavigating}
              followCursor={followCursor}
              alignToHeading={alignToHeading}
              onAlignToHeadingChange={setAlignToHeading}
              onMapClick={(coords) => {
                setReportCoords(coords);
                setQuickError('');
              }}
              heightClass="h-[520px]"
              interactiveHint={
                isNavigating
                  ? 'Navigation cursor active — tracking movement along your journey'
                  : 'Blue cursor marks start · Click any dashed route on map to switch paths'
              }
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#14213D] dark:text-white">
                  Available Routes
                </h2>
                {currentRouteEval &&
                  currentRouteEval.eval.onRouteCount === 0 &&
                  !recommendedSafeRoute &&
                  routes.length > 1 && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <ShieldCheck size={11} />
                      Safest Path
                    </span>
                  )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Green dashed line marks an optional safer alternative. Choose any route.
              </p>

              <div className="mt-3 space-y-2.5">
                {evaluatedRoutes.length === 0 ? (
                  <p className="text-xs text-slate-500">Computing route options...</p>
                ) : (
                  evaluatedRoutes.map(({ route: r, eval: ev }) => {
                    const active = r.index === selectedRouteIndex;
                    const isSuggestedSafe =
                      currentHasHazards && recommendedSafeRoute?.route.index === r.index;

                    return (
                      <button
                        key={r.index}
                        type="button"
                        onClick={() => handleSelectRoute(r.index)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
                          active
                            ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40'
                            : isSuggestedSafe
                            ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {r.label}
                            </span>
                            {isSuggestedSafe && (
                              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                Optional Safe · Shortest
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                            {(r.distanceMeters / 1000).toFixed(2)} km ·{' '}
                            {Math.max(1, Math.round(r.durationMillis / 60000))} mins
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            {ev.onRouteCount === 0 ? (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                0 hazards on path
                                {ev.corridorCount > 0 ? ` (${ev.corridorCount} nearby)` : ''}
                              </span>
                            ) : (
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                {ev.onRouteCount}{' '}
                                {ev.onRouteCount === 1 ? 'hazard' : 'hazards'} on path
                              </span>
                            )}
                          </div>
                        </div>
                        {active ? (
                          <Navigation size={15} className="shrink-0 text-[#2563EB]" />
                        ) : isSuggestedSafe ? (
                          <ShieldCheck
                            size={16}
                            className="shrink-0 text-emerald-600 dark:text-emerald-400"
                          />
                        ) : null}
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
