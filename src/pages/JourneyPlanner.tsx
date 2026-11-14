import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpDown,
  Bike,
  Car,
  Crosshair,
  Footprints,
  Loader2,
  Navigation,
} from 'lucide-react';
import { PlaceSearchInput } from '../components/PlaceSearchInput';
import { SidebarLayout } from '../components/Sidebar';
import { useSafetyData } from '../context/SafetyDataContext';
import { Coordinates, TravelMode } from '../types/safety';
import { formatCoords, PRESET_PLACES, reverseGeocodeOsm } from '../utils/location';

export const JourneyPlanner: React.FC = () => {
  const navigate = useNavigate();
  const {
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
  const [error, setError] = useState('');

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

  const handleSwap = () => {
    const nextOriginLabel = destLabel;
    const nextOriginCoords = destCoords;
    setOriginLabel(nextOriginLabel);
    setOriginCoords(nextOriginCoords);
    setDestLabel(originLabel);
    setDestCoords(originCoords);
  };

  const handlePlanJourney = (e: React.FormEvent) => {
    e.preventDefault();
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
    navigate('/journey-results');
  };

  const modes: Array<{ value: TravelMode; label: string; icon: React.FC<{ size?: number }> }> = [
    { value: 'DRIVING', label: 'Driving', icon: Car },
    { value: 'WALKING', label: 'Walking', icon: Footprints },
    { value: 'BICYCLING', label: 'Cycling', icon: Bike },
  ];

  return (
    <SidebarLayout title="Plan Your Journey">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#2563EB] uppercase dark:text-blue-400">
            <Navigation size={15} />
            <span>Route Hazard Awareness</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-[#14213D] dark:text-white">
            Plan Your Journey
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Compare primary and alternative routes alongside community-reported street
            hazards. Note that hazard reports are advisory and no route is guaranteed safe.
          </p>

          <form onSubmit={handlePlanJourney} className="mt-6 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Starting Location */}
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-[#14213D] dark:text-slate-200">
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
                  Use My Current Location (GPS)
                </button>
              </div>

              <PlaceSearchInput
                value={originLabel}
                onChange={setOriginLabel}
                onSelectPlace={(place) => {
                  setOriginLabel(place.label);
                  setOriginCoords(place.coords);
                }}
                placeholder="Search starting address or select a transit hub..."
              />
              <div className="mt-2 font-mono text-[11px] text-slate-500">
                Coords: {formatCoords(originCoords)}
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
              <div className="mb-2 text-xs font-bold text-[#14213D] dark:text-slate-200">
                Destination
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
              <div className="mt-2 font-mono text-[11px] text-slate-500">
                Coords: {formatCoords(destCoords)}
              </div>
            </div>

            {/* Travel Mode */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Travel Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {modes.map((m) => {
                  const Icon = m.icon;
                  const active = travelMode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setTravelMode(m.value)}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                        active
                          ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                      }`}
                    >
                      <Icon size={17} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Navigation size={16} />
              Plan Journey
              <ArrowRight size={16} />
            </button>
          </form>
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
