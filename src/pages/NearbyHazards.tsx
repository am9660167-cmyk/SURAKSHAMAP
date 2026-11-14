import React, { useMemo, useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import { HazardCard } from '../components/HazardCard';
import { MapView } from '../components/MapView';
import { SidebarLayout } from '../components/Sidebar';
import { useSafetyData } from '../context/SafetyDataContext';
import { HazardReport } from '../types/safety';
import { formatCoords, haversineDistanceKm } from '../utils/location';

export const NearbyHazards: React.FC = () => {
  const {
    hazards,
    userLocation,
    detectUserLocation,
    useApproximateLocation,
    gpsStatus,
    gpsNotice,
    gpsError,
  } = useSafetyData();
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [selectedHazard, setSelectedHazard] = useState<HazardReport | null>(null);

  const nearbyList = useMemo(() => {
    return hazards
      .filter((h) => h.status !== 'Rejected' && h.status !== 'Resolved')
      .map((h) => ({
        hazard: h,
        distanceKm: haversineDistanceKm(userLocation, h.location),
      }))
      .filter((item) => radiusKm === 0 || item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [hazards, userLocation, radiusKm]);

  return (
    <SidebarLayout title="Nearby Hazards">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="text-sm font-bold text-[#14213D] dark:text-white">
              Hazards Near Your Reference Point
            </div>
            <div className="mt-0.5 font-mono text-xs text-slate-500">
              Center: {formatCoords(userLocation)} · {nearbyList.length} reports found
            </div>
            {gpsError && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
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
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {gpsNotice}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[1, 3, 5, 0].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    radiusKm === r
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {r === 0 ? 'All Areas' : `${r} km`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void detectUserLocation()}
              disabled={gpsStatus === 'detecting'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {gpsStatus === 'detecting' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Crosshair size={14} />
              )}
              Refresh GPS
            </button>
          </div>
        </div>

        <MapView
          hazards={nearbyList.map((i) => i.hazard)}
          center={selectedHazard?.location ?? userLocation}
          userLocation={userLocation}
          selectedHazard={selectedHazard}
          onSelectHazard={setSelectedHazard}
          heightClass="h-[360px]"
        />

        {nearbyList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No hazards found within {radiusKm} km.
            </p>
            <button
              type="button"
              onClick={() => setRadiusKm(0)}
              className="mt-3 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
            >
              Expand to All Areas
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nearbyList.map(({ hazard }) => (
              <HazardCard
                key={hazard.id}
                hazard={hazard}
                onSelectOnMap={(h) => {
                  setSelectedHazard(h);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};
