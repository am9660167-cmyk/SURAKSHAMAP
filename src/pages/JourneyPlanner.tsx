import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bike,
  Car,
  Clock,
  Crosshair,
  Footprints,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Route,
} from 'lucide-react';
import { ComputedRouteSummary, MapView } from '../components/MapView';
import { PlaceSearchInput } from '../components/PlaceSearchInput';
import { SidebarLayout } from '../components/Sidebar';
import { useSafetyData } from '../context/SafetyDataContext';
import { Coordinates, TravelMode } from '../types/safety';
import {
  distancePointToPolylineKm,
  formatCoords,
  PRESET_PLACES,
  reverseGeocodeOsm,
} from '../utils/location';

export const JourneyPlanner: React.FC = () => {
  const navigate = useNavigate();
  const {
    hazards,
    userLocation,
    journeyRequest,
    setJourneyRequest,
    detectUserLocation,
    useApproximateLocation,
    gpsStatus,
    gpsNotice,
    gpsError,
  } = useSafetyData();

  const [originLabel, setOriginLabel] = useState(journeyRequest.originLabel);
  const [originCoords, setOriginCoords] = useState<Coordinates>(
    journeyRequest.originCoords
  );
  const [destLabel, setDestLabel] = useState(journeyRequest.destinationLabel);
  const [destCoords, setDestCoords] = useState<Coordinates>(
    journeyRequest.destinationCoords
  );
  const [travelMode, setTravelMode] = useState<TravelMode>(
    journeyRequest.travelMode
  );
  const [mapPickTarget, setMapPickTarget] = useState<'origin' | 'destination'>(
    'destination'
  );
  const [previewRoutes, setPreviewRoutes] = useState<ComputedRouteSummary[]>([]);
  const [error, setError] = useState('');

  const primaryRoute = previewRoutes[0] ?? null;

  const corridorHazards = useMemo(() => {
    const path = primaryRoute?.path ?? [originCoords, destCoords];
    return hazards.filter(
      (h) =>
        h.status !== 'Rejected' &&
        h.status !== 'Resolved' &&
        distancePointToPolylineKm(h.location, path) <= 1.8
    );
  }, [hazards, primaryRoute, originCoords, destCoords]);

  const mapCenter: Coordinates = {
    lat: (originCoords.lat + destCoords.lat) / 2,
    lng: (originCoords.lng + destCoords.lng) / 2,
  };

  const handleUseCurrentGps = async () => {
    const coords = await detectUserLocation();
    if (coords) {
      setOriginCoords(coords);
      setOriginLabel(`My Current Location (${formatCoords(coords)})`);
      const resolved = await reverseGeocodeOsm(coords);
      if (resolved) {
        setOriginLabel(resolved);
      }
    }
  };

  const handleMapClickSetPoint = async (coords: Coordinates) => {
    if (mapPickTarget === 'origin') {
      setOriginCoords(coords);
      setOriginLabel(`Selected Start (${formatCoords(coords)})`);
      const resolved = await reverseGeocodeOsm(coords);
      if (resolved) setOriginLabel(resolved);
    } else {
      setDestCoords(coords);
      setDestLabel(`Selected Destination (${formatCoords(coords)})`);
      const resolved = await reverseGeocodeOsm(coords);
      if (resolved) setDestLabel(resolved);
    }
  };

  const handleSwap = () => {
    const nextOriginLabel = destLabel;
    const nextOriginCoords = destCoords;
    setOriginLabel(nextOriginLabel);
    setOriginCoords(nextOriginCoords);
    setDestLabel(originLabel);
    setDestCoords(originCoords);
  };

  const submitJourney = (autoStart: boolean) => {
    setError('');
    if (!originLabel.trim() || !destLabel.trim()) {
      setError('Please specify both a starting location and a destination.');
      return;
    }

    setJourneyRequest({
      originLabel: originLabel.trim(),
      originCoords,
      destinationLabel: destLabel.trim(),
      destinationCoords: destCoords,
      travelMode,
    });
    navigate('/journey-results', { state: { autoStart } });
  };

  const handlePlanJourney = (e: React.FormEvent) => {
    e.preventDefault();
    submitJourney(false);
  };

  const modes: Array<{ value: TravelMode; label: string; icon: React.FC<{ size?: number }> }> = [
    { value: 'DRIVING', label: 'Driving', icon: Car },
    { value: 'WALKING', label: 'Walking', icon: Footprints },
    { value: 'BICYCLING', label: 'Cycling', icon: Bike },
  ];

  return (
    <SidebarLayout title="Plan Your Journey">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Form Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#2563EB] uppercase dark:text-blue-400">
              <Navigation size={15} />
              <span>Route Hazard Awareness</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-[#14213D] dark:text-white">
              Plan Your Journey
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Set your starting location and destination by searching, using GPS, or
              tapping on the live map. A directional arrow marks your heading along
              the route.
            </p>

            <form onSubmit={handlePlanJourney} className="mt-5 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Starting Location */}
              <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14213D] dark:text-slate-200">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                    Starting Location
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleUseCurrentGps()}
                    disabled={gpsStatus === 'detecting'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                  >
                    {gpsStatus === 'detecting' ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Crosshair size={13} />
                    )}
                    Use Current GPS
                  </button>
                </div>

                <PlaceSearchInput
                  value={originLabel}
                  onChange={setOriginLabel}
                  onSelectPlace={(place) => {
                    setOriginLabel(place.label);
                    setOriginCoords(place.coords);
                  }}
                  placeholder="Search starting address or select a hub..."
                />
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <span>{formatCoords(originCoords)}</span>
                  <button
                    type="button"
                    onClick={() => setMapPickTarget('origin')}
                    className={`font-sans text-[11px] font-semibold ${
                      mapPickTarget === 'origin'
                        ? 'text-emerald-700 underline dark:text-emerald-400'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {mapPickTarget === 'origin' ? 'Tap map to move Start' : 'Pick on map'}
                  </button>
                </div>
                {gpsError && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <span>{gpsError}</span>
                    <button
                      type="button"
                      onClick={() =>
                        void useApproximateLocation().then(async (coords) => {
                          if (!coords) return;
                          setOriginCoords(coords);
                          setOriginLabel(`Approximate Location (${formatCoords(coords)})`);
                          const resolved = await reverseGeocodeOsm(coords);
                          if (resolved) setOriginLabel(resolved);
                        })
                      }
                      className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                    >
                      Use Approximate Location
                    </button>
                  </div>
                )}
                {gpsNotice && !gpsError && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {gpsNotice}
                  </p>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ArrowUpDown size={14} />
                  Swap Start & Destination
                </button>
              </div>

              {/* Destination */}
              <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14213D] dark:text-slate-200">
                    <MapPin size={13} className="text-[#DC2626]" />
                    Destination
                  </span>
                </div>
                <PlaceSearchInput
                  value={destLabel}
                  onChange={setDestLabel}
                  onSelectPlace={(place) => {
                    setDestLabel(place.label);
                    setDestCoords(place.coords);
                  }}
                  placeholder="Search destination address or landmark..."
                />
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <span>{formatCoords(destCoords)}</span>
                  <button
                    type="button"
                    onClick={() => setMapPickTarget('destination')}
                    className={`font-sans text-[11px] font-semibold ${
                      mapPickTarget === 'destination'
                        ? 'text-red-600 underline dark:text-red-400'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {mapPickTarget === 'destination'
                      ? 'Tap map to move Destination'
                      : 'Pick on map'}
                  </button>
                </div>
              </div>

              {/* Travel Mode */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Travel Mode
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {modes.map((m) => {
                    const Icon = m.icon;
                    const active = travelMode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setTravelMode(m.value)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-400'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                        }`}
                      >
                        <Icon size={15} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#2563EB] bg-white py-3 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-blue-50 dark:bg-slate-950 dark:text-blue-400 dark:hover:bg-blue-950/40"
                >
                  <Navigation size={15} />
                  Preview Analysis
                </button>
                <button
                  type="button"
                  onClick={() => submitJourney(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Play size={15} className="fill-current" />
                  Start Journey Now
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Route Preview Map */}
          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Live Route Position Preview
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setMapPickTarget('origin')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    mapPickTarget === 'origin'
                      ? 'bg-[#16A34A] text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Map Click = Start
                </button>
                <button
                  type="button"
                  onClick={() => setMapPickTarget('destination')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    mapPickTarget === 'destination'
                      ? 'bg-[#DC2626] text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Map Click = Destination
                </button>
              </div>
            </div>

            <MapView
              hazards={corridorHazards}
              center={mapCenter}
              zoom={13}
              userLocation={userLocation}
              routeOrigin={originCoords}
              routeDestination={destCoords}
              travelMode={travelMode}
              selectedRouteIndex={0}
              showRouteTriangle
              onRoutesComputed={setPreviewRoutes}
              onMapClick={(coords) => {
                void handleMapClickSetPoint(coords);
              }}
              heightClass="h-[460px]"
              interactiveHint={
                mapPickTarget === 'origin'
                  ? 'Click map to set Starting Location (green anchor + navigation triangle)'
                  : 'Click map to set Destination (red pin)'
              }
            />

            {/* Live Route Summary Strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Route size={13} className="text-[#2563EB]" />
                  Route Distance
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#14213D] tabular-nums dark:text-white">
                  {primaryRoute
                    ? `${(primaryRoute.distanceMeters / 1000).toFixed(2)} km`
                    : 'Calculating...'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Clock size={13} className="text-[#2563EB]" />
                  Estimated Time
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#14213D] tabular-nums dark:text-white">
                  {primaryRoute
                    ? `${Math.max(1, Math.round(primaryRoute.durationMillis / 60000))} mins`
                    : '—'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <AlertTriangle size={13} className="text-amber-500" />
                  Route Hazards
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#14213D] tabular-nums dark:text-white">
                  {corridorHazards.length} active
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Corridor Presets */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-[#14213D] dark:text-white">
            Sample Urban Corridors
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              {
                from: PRESET_PLACES[5],
                to: PRESET_PLACES[1],
                mode: 'DRIVING' as TravelMode,
              },
              {
                from: PRESET_PLACES[0],
                to: PRESET_PLACES[2],
                mode: 'BICYCLING' as TravelMode,
              },
            ].map((corridor, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setOriginLabel(corridor.from.name);
                  setOriginCoords(corridor.from.coords);
                  setDestLabel(corridor.to.name);
                  setDestCoords(corridor.to.coords);
                  setTravelMode(corridor.mode);
                }}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-xs transition-colors hover:border-blue-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {corridor.from.name} → {corridor.to.name}
                  </div>
                  <div className="mt-0.5 text-slate-500">
                    Mode: {corridor.mode.toLowerCase()}
                  </div>
                </div>
                <ArrowRight size={14} className="shrink-0 text-blue-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};
