import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Crosshair,
  Filter,
  Loader2,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { HazardCard } from '../components/HazardCard';
import { MapView } from '../components/MapView';
import { PlaceSearchInput } from '../components/PlaceSearchInput';
import { SidebarLayout } from '../components/Sidebar';
import { useSafetyData } from '../context/SafetyDataContext';
import {
  Coordinates,
  HazardCategory,
  HazardReport,
  HazardSeverity,
} from '../types/safety';
import { HAZARD_CATEGORIES, SEVERITY_OPTIONS } from '../utils/hazardHelpers';

export const HazardMap: React.FC = () => {
  const {
    hazards,
    userLocation,
    hasDetectedGps,
    detectUserLocation,
    useApproximateLocation,
    gpsStatus,
    gpsNotice,
    gpsError,
  } = useSafetyData();

  const [mapCenter, setMapCenter] = useState<Coordinates>(userLocation);

  useEffect(() => {
    if (hasDetectedGps) {
      setMapCenter(userLocation);
    }
  }, [hasDetectedGps, userLocation.lat, userLocation.lng]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HazardCategory | 'All'>(
    'All'
  );
  const [selectedSeverity, setSelectedSeverity] = useState<HazardSeverity | 'All'>(
    'All'
  );
  const [selectedHazard, setSelectedHazard] = useState<HazardReport | null>(null);

  const filteredHazards = useMemo(() => {
    return hazards.filter((h) => {
      if (h.status === 'Rejected' || h.status === 'Resolved') return false;
      if (selectedCategory !== 'All' && h.category !== selectedCategory) return false;
      if (selectedSeverity !== 'All' && h.severity !== selectedSeverity) return false;
      return true;
    });
  }, [hazards, selectedCategory, selectedSeverity]);

  const handleUseMyLocation = async () => {
    const coords = await detectUserLocation();
    if (coords) {
      setMapCenter(coords);
    }
  };

  return (
    <SidebarLayout title="Explore Hazard Map">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Search + GPS + Severity Filter Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-5">
              <PlaceSearchInput
                label="Search Map Location"
                value={searchValue}
                onChange={setSearchValue}
                onSelectPlace={(place) => setMapCenter(place.coords)}
                placeholder="Search area, street, or junction..."
              />
            </div>

            <div className="lg:col-span-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Filter size={13} />
                Severity Filter
              </label>
              <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(['All', ...SEVERITY_OPTIONS] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSelectedSeverity(sev)}
                    className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedSeverity === sev
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:col-span-3 lg:justify-end">
              <button
                type="button"
                onClick={() => void handleUseMyLocation()}
                disabled={gpsStatus === 'detecting'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                {gpsStatus === 'detecting' ? (
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                ) : (
                  <Crosshair size={14} className="text-blue-600" />
                )}
                My Location
              </button>

              {(selectedCategory !== 'All' || selectedSeverity !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedSeverity('All');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {gpsError && (
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-amber-700 dark:text-amber-400">
              <span>{gpsError}</span>
              <button
                type="button"
                onClick={() =>
                  void useApproximateLocation().then((coords) => {
                    if (coords) setMapCenter(coords);
                  })
                }
                className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                Use Approximate Location
              </button>
            </div>
          )}

          {gpsNotice && !gpsError && (
            <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
              {gpsNotice}
            </p>
          )}

          {/* Category Filter Bar */}
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === 'All'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              All Categories (
              {
                hazards.filter(
                  (h) => h.status !== 'Rejected' && h.status !== 'Resolved'
                ).length
              }
              )
            </button>

            {HAZARD_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                  style={active ? { backgroundColor: cat.color } : undefined}
                >
                  <CategoryIcon category={cat.name} size={13} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Interactive Map */}
        <MapView
          hazards={filteredHazards}
          center={mapCenter}
          userLocation={userLocation}
          selectedHazard={selectedHazard}
          onSelectHazard={setSelectedHazard}
          heightClass="h-[520px]"
          interactiveHint={`Showing ${filteredHazards.length} hazard markers · Click any pin to inspect or confirm`}
        />

        {/* Map Legend explaining all 12 colors and icons */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#14213D] dark:text-white">
                Hazard Map Legend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Color-coded markers identify each hazard type at a glance.
              </p>
            </div>
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <AlertTriangle size={14} />
              Report New Hazard
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {HAZARD_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800"
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: cat.color }}
                >
                  <CategoryIcon category={cat.name} size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                    {cat.name}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {cat.shortDesc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtered Hazard List */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#14213D] dark:text-white">
              Matching Hazards ({filteredHazards.length})
            </h2>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <MapPin size={13} /> Click Locate to focus marker
            </span>
          </div>

          {filteredHazards.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No hazards match your active filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSeverity('All');
                }}
                className="mt-3 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
              >
                Show All Hazards
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredHazards.map((hazard) => (
                <HazardCard
                  key={hazard.id}
                  hazard={hazard}
                  onSelectOnMap={(h) => {
                    setMapCenter(h.location);
                    setSelectedHazard(h);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};
