import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { Coordinates } from '../types/safety';
import { PRESET_PLACES } from '../utils/location';

export interface SelectedPlaceResult {
  label: string;
  address: string;
  coords: Coordinates;
}

interface PlaceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace: (place: SelectedPlaceResult) => void;
  placeholder?: string;
  label?: string;
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
}

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  value,
  onChange,
  onSelectPlace,
  placeholder,
  label,
}) => {
  const [open, setOpen] = useState(false);
  const [osmResults, setOsmResults] = useState<SelectedPlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const trimmed = value.trim();
  const queryLower = trimmed.toLowerCase();

  useEffect(() => {
    if (!open || trimmed.length < 3) {
      setOsmResults([]);
      setIsLoading(false);
      return;
    }

    const coordCheck = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordCheck) {
      setOsmResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);

    const timer = setTimeout(() => {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
        trimmed
      )}`;

      fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: NominatimItem[]) => {
          if (cancelled || !Array.isArray(rows)) return;
          const mapped: SelectedPlaceResult[] = rows.map((row) => {
            const parts = row.display_name.split(',').map((s) => s.trim());
            const shortLabel = row.name?.trim() || parts.slice(0, 2).join(', ');
            return {
              label: shortLabel,
              address: row.display_name,
              coords: {
                lat: Number(Number(row.lat).toFixed(6)),
                lng: Number(Number(row.lon).toFixed(6)),
              },
            };
          });
          setOsmResults(mapped);
        })
        .catch(() => {
          if (!cancelled) setOsmResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, open]);

  const presetMatches = PRESET_PLACES.filter(
    (p) =>
      !queryLower ||
      p.name.toLowerCase().includes(queryLower) ||
      p.address.toLowerCase().includes(queryLower)
  );

  const coordMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);

  return (
    <div className="relative">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 text-slate-400"
        />
        <input
          type="text"
          value={value}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={
            placeholder ?? 'Search OpenStreetMap places, streets, or lat, lng...'
          }
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        {isLoading && (
          <Loader2
            size={14}
            className="absolute right-3 animate-spin text-blue-600"
          />
        )}
      </div>

      {open && (osmResults.length > 0 || presetMatches.length > 0 || coordMatch) && (
        <ul className="absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {coordMatch && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const lat = Number(coordMatch[1]);
                  const lng = Number(coordMatch[2]);
                  onSelectPlace({
                    label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                    address: `Custom Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
                    coords: { lat, lng },
                  });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <MapPin size={14} className="shrink-0 text-blue-600" />
                <span>
                  Use coordinates: {coordMatch[1]}, {coordMatch[2]}
                </span>
              </button>
            </li>
          )}

          {osmResults.map((item, idx) => (
            <li key={`osm-${idx}-${item.coords.lat}-${item.coords.lng}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item.label);
                  onSelectPlace(item);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#2563EB]" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {item.label}
                  </div>
                  <div className="truncate text-xs text-slate-500">{item.address}</div>
                </div>
              </button>
            </li>
          ))}

          {presetMatches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p.name);
                  onSelectPlace({
                    label: p.name,
                    address: p.address,
                    coords: p.coords,
                  });
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {p.name}
                  </div>
                  <div className="truncate text-xs text-slate-500">{p.address}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
