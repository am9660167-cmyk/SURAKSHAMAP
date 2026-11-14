import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-rotate';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CheckCircle2,
  Compass,
  Crosshair,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';
import { Coordinates, HazardReport, TravelMode } from '../types/safety';
import {
  formatRelativeDate,
  getCategoryMeta,
  getSeverityColor,
  getStatusColor,
} from '../utils/hazardHelpers';
import {
  buildSimulatedRoutePaths,
  calculateBearingDegrees,
  DEFAULT_MAP_CENTER,
  formatCoords,
  formatDistance,
  haversineDistanceKm,
} from '../utils/location';
import { CategoryIcon } from './CategoryIcon';

export interface ComputedRouteSummary {
  index: number;
  label: string;
  distanceMeters: number;
  durationMillis: number;
  path: Coordinates[];
}

interface MapViewProps {
  hazards: HazardReport[];
  center?: Coordinates;
  zoom?: number;
  heightClass?: string;
  userLocation?: Coordinates | null;
  selectedHazard?: HazardReport | null;
  onSelectHazard?: (hazard: HazardReport | null) => void;
  pickerPosition?: Coordinates | null;
  onPickerChange?: (coords: Coordinates) => void;
  onMapClick?: (coords: Coordinates) => void;
  routeOrigin?: Coordinates | null;
  routeDestination?: Coordinates | null;
  travelMode?: TravelMode;
  selectedRouteIndex?: number;
  onRoutesComputed?: (routes: ComputedRouteSummary[]) => void;
  navigationPosition?: Coordinates | null;
  navigationHeading?: number | null;
  isNavigating?: boolean;
  followCursor?: boolean;
  alignToHeading?: boolean;
  onAlignToHeadingChange?: (align: boolean) => void;
  allowResolvedPin?: boolean;
  showConfigNotice?: boolean;
  interactiveHint?: string;
}

const HazardInfoCard: React.FC<{
  hazard: HazardReport;
  onClose: () => void;
  distanceFromRouteKm?: number;
}> = ({ hazard, onClose, distanceFromRouteKm }) => {
  const { user } = useAuth();
  const { confirmHazard, reportNotPresent } = useSafetyData();
  const actorId = user?.id ?? 'guest-citizen';
  const meta = getCategoryMeta(hazard.category);
  const sev = getSeverityColor(hazard.severity);
  const statusClass = getStatusColor(hazard.status);

  return (
    <div className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3.5 text-left text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded text-white"
            style={{ backgroundColor: meta.color }}
          >
            <CategoryIcon category={hazard.category} size={12} />
          </span>
          <span className="truncate">{hazard.category}</span>
          <span aria-hidden="true">·</span>
          <span className={sev.textClass}>{hazard.severity}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={14} />
        </button>
      </div>

      <h4 className="mt-1.5 text-sm font-bold leading-snug text-slate-900 dark:text-white">
        {hazard.title}
      </h4>

      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {hazard.description}
      </p>

      {hazard.photoUrl && (
        <img
          src={hazard.photoUrl}
          alt={hazard.title}
          referrerPolicy="no-referrer"
          className="mt-2 h-24 w-full rounded-md object-cover"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span className={`font-semibold ${statusClass}`}>{hazard.status}</span>
        <span aria-hidden="true">·</span>
        <span>{formatRelativeDate(hazard.reportedAt)}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
          {hazard.confirmations}
        </span>
        {distanceFromRouteKm !== undefined && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {formatDistance(distanceFromRouteKm)} from route
            </span>
          </>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => confirmHazard(hazard.id, actorId)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ThumbsUp size={11} />
          Confirm
        </button>
        <button
          type="button"
          onClick={() => reportNotPresent(hazard.id, actorId)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ThumbsDown size={11} />
          Cleared
        </button>
      </div>
    </div>
  );
};

function createHazardDivIcon(hazard: HazardReport, selected: boolean): L.DivIcon {
  const meta = getCategoryMeta(hazard.category);
  const isCritical = hazard.severity === 'Critical';
  const size = isCritical ? 36 : 32;
  const iconHtml = renderToStaticMarkup(
    <CategoryIcon category={hazard.category} size={isCritical ? 17 : 15} />
  );
  const ring = selected
    ? 'box-shadow: 0 0 0 4px rgba(37,99,235,0.35), 0 4px 10px rgba(0,0,0,0.3); transform: scale(1.18);'
    : 'box-shadow: 0 3px 8px rgba(0,0,0,0.28);';

  return L.divIcon({
    className: 'suraksha-div-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${meta.color};color:#ffffff;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;${ring}transition:transform 150ms ease;">${iconHtml}</div>`,
  });
}

function createPinBadgeIcon(label: string, bg: string): L.DivIcon {
  return L.divIcon({
    className: 'suraksha-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${bg};color:#ffffff;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 3px 8px rgba(0,0,0,0.3);">${label}</div>`,
  });
}

function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'suraksha-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563EB;border:3px solid #ffffff;box-shadow:0 0 0 5px rgba(37,99,235,0.25), 0 2px 6px rgba(0,0,0,0.25);"></div>`,
  });
}

function createPickerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'suraksha-div-icon',
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:32px;height:32px;border-radius:9999px;background:#2563EB;border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.35);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div><div style="width:2px;height:10px;background:#14213D;"></div></div>`,
  });
}

function createNavigationCursorIcon(
  headingDeg: number,
  isNavigating: boolean
): L.DivIcon {
  const pulse = isNavigating
    ? `<div class="suraksha-nav-pulse" style="position:absolute;inset:2px;border-radius:9999px;background:rgba(37,99,235,0.35);"></div>`
    : `<div style="position:absolute;inset:4px;border-radius:9999px;background:rgba(37,99,235,0.18);"></div>`;

  return L.divIcon({
    className: 'suraksha-div-icon',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">${pulse}<div style="position:relative;width:28px;height:28px;border-radius:9999px;background:#2563EB;border:2.5px solid #ffffff;box-shadow:0 4px 12px rgba(15,23,42,0.42);display:flex;align-items:center;justify-content:center;transform:rotate(${Math.round(headingDeg)}deg);transition:transform 220ms ease;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polygon points="12,3 20,20 12,16.2 4,20" fill="#ffffff"/></svg></div></div>`,
  });
}

function buildFallbackRoutes(
  origin: Coordinates,
  destination: Coordinates,
  travelMode: TravelMode
): ComputedRouteSummary[] {
  const { primary, alternative } = buildSimulatedRoutePaths(origin, destination);
  const baseKm = Math.max(1.2, haversineDistanceKm(origin, destination) * 1.24);
  const altKm = baseKm * 1.15;
  const speedKmh =
    travelMode === 'WALKING' ? 4.8 : travelMode === 'BICYCLING' ? 16 : 30;

  return [
    {
      index: 0,
      label: 'Primary Route',
      distanceMeters: Math.round(baseKm * 1000),
      durationMillis: Math.round((baseKm / speedKmh) * 3600000),
      path: primary,
    },
    {
      index: 1,
      label: 'Alternative Route',
      distanceMeters: Math.round(altKm * 1000),
      durationMillis: Math.round((altKm / speedKmh) * 3600000),
      path: alternative,
    },
  ];
}

const LocateControl: React.FC<{
  center: Coordinates;
  userLocation?: Coordinates | null;
  mapRef: React.RefObject<L.Map | null>;
}> = ({ center, userLocation, mapRef }) => {
  const { detectUserLocation, gpsStatus } = useSafetyData();

  const handleLocate = async () => {
    const detected = await detectUserLocation();
    const target = detected ?? userLocation ?? center;
    mapRef.current?.setView([target.lat, target.lng], 14, { animate: true });
  };

  return (
    <button
      type="button"
      onClick={() => void handleLocate()}
      disabled={gpsStatus === 'detecting'}
      title="Detect my current location"
      aria-label="Detect my current location"
      className="p-2 text-blue-600 hover:bg-slate-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-slate-800"
    >
      {gpsStatus === 'detecting' ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Crosshair size={15} />
      )}
    </button>
  );
};

export const MapView: React.FC<MapViewProps> = ({
  hazards,
  center = DEFAULT_MAP_CENTER,
  zoom = 13,
  heightClass = 'h-[480px]',
  userLocation,
  selectedHazard,
  onSelectHazard,
  pickerPosition,
  onPickerChange,
  onMapClick,
  routeOrigin,
  routeDestination,
  travelMode = 'DRIVING',
  selectedRouteIndex = 0,
  onRoutesComputed,
  navigationPosition,
  navigationHeading,
  isNavigating = false,
  followCursor = false,
  alignToHeading,
  onAlignToHeadingChange,
  allowResolvedPin = false,
  interactiveHint,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const hazardLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const navLayerRef = useRef<L.LayerGroup | null>(null);
  const navCursorMarkerRef = useRef<L.Marker | null>(null);

  const onPickerChangeRef = useRef(onPickerChange);
  const onMapClickRef = useRef(onMapClick);
  const onSelectHazardRef = useRef(onSelectHazard);
  const onRoutesComputedRef = useRef(onRoutesComputed);

  onPickerChangeRef.current = onPickerChange;
  onMapClickRef.current = onMapClick;
  onSelectHazardRef.current = onSelectHazard;
  onRoutesComputedRef.current = onRoutesComputed;

  const [internalSelected, setInternalSelected] = useState<HazardReport | null>(null);
  const [viewCenter, setViewCenter] = useState<Coordinates>(center);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [mapBearing, setMapBearing] = useState<number>(0);
  const [internalAlignHeading, setInternalAlignHeading] = useState<boolean>(false);
  const [computedRoutes, setComputedRoutes] = useState<ComputedRouteSummary[]>([]);
  const lastPanPosRef = useRef<Coordinates | null>(null);

  const isAlignToHeading =
    alignToHeading !== undefined ? alignToHeading : internalAlignHeading;

  const setAlignToHeading = (next: boolean) => {
    setInternalAlignHeading(next);
    onAlignToHeadingChange?.(next);
  };

  const activeHazard =
    selectedHazard !== undefined ? selectedHazard : internalSelected;

  const setActiveHazard = (h: HazardReport | null) => {
    setInternalSelected(h);
    onSelectHazardRef.current?.(h);
  };

  // Initialize Leaflet Map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      rotate: true,
      bearing: 0,
      touchRotate: true,
      shiftKeyRotate: true,
      rotateControl: false,
      pitchDrag: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const routeGroup = L.layerGroup().addTo(map);
    const hazardGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);
    const navGroup = L.layerGroup().addTo(map);

    routeLayerRef.current = routeGroup;
    hazardLayerRef.current = hazardGroup;
    markerLayerRef.current = markerGroup;
    navLayerRef.current = navGroup;
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const coords: Coordinates = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };
      onPickerChangeRef.current?.(coords);
      onMapClickRef.current?.(coords);
    });

    map.on('moveend zoomend', () => {
      const c = map.getCenter();
      setViewCenter({
        lat: Number(c.lat.toFixed(5)),
        lng: Number(c.lng.toFixed(5)),
      });
      setCurrentZoom(map.getZoom());
    });

    map.on('rotate', () => {
      const deg = ((Math.round(map.getBearing()) % 360) + 360) % 360;
      setMapBearing(deg);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      hazardLayerRef.current = null;
      markerLayerRef.current = null;
      navLayerRef.current = null;
      navCursorMarkerRef.current = null;
    };
  }, []);

  // Sync map view when center prop changes externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    setViewCenter(center);
  }, [center.lat, center.lng]);

  const visibleHazards = hazards.filter(
    (h) => h.status !== 'Rejected' && (allowResolvedPin || h.status !== 'Resolved')
  );

  // Close popup automatically if the selected hazard was resolved or deleted
  useEffect(() => {
    if (!activeHazard) return;
    const stillVisible = visibleHazards.some((h) => h.id === activeHazard.id);
    if (!stillVisible) {
      setInternalSelected(null);
      onSelectHazardRef.current?.(null);
    }
  }, [visibleHazards, activeHazard?.id]);

  // Render Hazard Markers
  useEffect(() => {
    const group = hazardLayerRef.current;
    if (!group) return;
    group.clearLayers();

    visibleHazards.forEach((hazard) => {
      const isSelected = activeHazard?.id === hazard.id;
      const marker = L.marker([hazard.location.lat, hazard.location.lng], {
        icon: createHazardDivIcon(hazard, isSelected),
        title: `${hazard.category}: ${hazard.title}`,
        zIndexOffset: isSelected ? 500 : hazard.severity === 'Critical' ? 200 : 100,
      });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setActiveHazard(hazard);
      });

      marker.addTo(group);
    });
  }, [hazards, allowResolvedPin, activeHazard?.id]);

  // Render User GPS, Picker, Origin & Destination markers
  useEffect(() => {
    const group = markerLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserLocationIcon(),
        title: 'Your Location',
        interactive: false,
      }).addTo(group);
    }

    if (pickerPosition) {
      const picker = L.marker([pickerPosition.lat, pickerPosition.lng], {
        icon: createPickerIcon(),
        draggable: Boolean(onPickerChange),
        title: 'Selected Location (Drag to adjust)',
        zIndexOffset: 600,
      });

      if (onPickerChange) {
        picker.on('dragend', () => {
          const pos = picker.getLatLng();
          onPickerChangeRef.current?.({
            lat: Number(pos.lat.toFixed(6)),
            lng: Number(pos.lng.toFixed(6)),
          });
        });
      }

      picker.addTo(group);
    }

    if (routeOrigin) {
      L.marker([routeOrigin.lat, routeOrigin.lng], {
        icon: createPinBadgeIcon('A', '#16A34A'),
        title: 'Starting Point',
        zIndexOffset: 550,
      }).addTo(group);
    }

    if (routeDestination) {
      L.marker([routeDestination.lat, routeDestination.lng], {
        icon: createPinBadgeIcon('B', '#DC2626'),
        title: 'Destination',
        zIndexOffset: 550,
      }).addTo(group);
    }
  }, [
    userLocation?.lat,
    userLocation?.lng,
    pickerPosition?.lat,
    pickerPosition?.lng,
    routeOrigin?.lat,
    routeOrigin?.lng,
    routeDestination?.lat,
    routeDestination?.lng,
    Boolean(onPickerChange),
  ]);

  // Fetch OpenStreetMap OSRM Routes when routeOrigin & routeDestination exist
  useEffect(() => {
    if (!routeOrigin || !routeDestination) {
      setComputedRoutes([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const osrmProfile =
      travelMode === 'WALKING'
        ? 'foot'
        : travelMode === 'BICYCLING'
        ? 'bike'
        : 'driving';

    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${routeOrigin.lng},${routeOrigin.lat};${routeDestination.lng},${routeDestination.lat}?overview=full&geometries=geojson&alternatives=true`;

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('OSRM failed'))))
      .then((data) => {
        if (cancelled) return;
        const osrmRoutes = Array.isArray(data?.routes) ? data.routes : [];
        if (osrmRoutes.length === 0) {
          throw new Error('No OSRM routes returned');
        }

        const speedScaleKmh =
          travelMode === 'WALKING' ? 4.8 : travelMode === 'BICYCLING' ? 16 : null;

        const mapped: ComputedRouteSummary[] = osrmRoutes.map(
          (
            r: {
              distance?: number;
              duration?: number;
              geometry?: { coordinates?: [number, number][] };
            },
            idx: number
          ) => {
            const coords: Coordinates[] = (r.geometry?.coordinates ?? []).map(
              ([lng, lat]) => ({ lat, lng })
            );
            const distanceMeters = Math.round(
              r.distance ??
                haversineDistanceKm(routeOrigin, routeDestination) * 1000
            );
            // Public OSRM server primarily profiles car speeds; scale time realistically for walking/cycling
            const durationMillis = speedScaleKmh
              ? Math.round(((distanceMeters / 1000) / speedScaleKmh) * 3600000)
              : Math.round((r.duration ?? 600) * 1000);

            return {
              index: idx,
              label: idx === 0 ? 'Primary Route' : `Alternative Route ${idx}`,
              distanceMeters,
              durationMillis,
              path:
                coords.length >= 2
                  ? coords
                  : [routeOrigin, routeDestination],
            };
          }
        );

        // Ensure at least one alternative option exists so route switching always works
        if (mapped.length === 1) {
          const fallbackAlt = buildFallbackRoutes(
            routeOrigin,
            routeDestination,
            travelMode
          )[1];
          mapped.push({
            ...fallbackAlt,
            index: 1,
            label: 'Alternative Route 1',
          });
        }

        setComputedRoutes(mapped);
        onRoutesComputedRef.current?.(mapped);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = buildFallbackRoutes(
          routeOrigin,
          routeDestination,
          travelMode
        );
        setComputedRoutes(fallback);
        onRoutesComputedRef.current?.(fallback);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    routeOrigin?.lat,
    routeOrigin?.lng,
    routeDestination?.lat,
    routeDestination?.lng,
    travelMode,
  ]);

  // Draw OpenStreetMap route polylines on Leaflet
  useEffect(() => {
    const group = routeLayerRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    if (computedRoutes.length === 0) return;

    // Draw unselected routes first so selected route stays on top
    const ordered = [...computedRoutes].sort((a, b) =>
      a.index === selectedRouteIndex ? 1 : b.index === selectedRouteIndex ? -1 : 0
    );

    ordered.forEach((route) => {
      const isSelected = route.index === selectedRouteIndex;
      const latLngs: L.LatLngExpression[] = route.path.map((pt) => [pt.lat, pt.lng]);
      L.polyline(latLngs, {
        color: isSelected ? '#2563EB' : '#64748B',
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.92 : 0.6,
        dashArray: isSelected ? undefined : '8 8',
      }).addTo(group);
    });

    const target = computedRoutes[selectedRouteIndex] ?? computedRoutes[0];
    if (target && target.path.length >= 2) {
      const bounds = L.latLngBounds(
        target.path.map((pt) => [pt.lat, pt.lng] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
    }
  }, [computedRoutes, selectedRouteIndex]);

  // Render & smoothly move the directional navigation cursor (starting position -> live location)
  useEffect(() => {
    const navGroup = navLayerRef.current;
    const map = mapRef.current;
    if (!navGroup || !map) return;

    const effectivePos = navigationPosition ?? routeOrigin ?? null;

    const activeRoutePath =
      (computedRoutes[selectedRouteIndex] ?? computedRoutes[0])?.path ?? [];
    let resolvedHeading = navigationHeading ?? null;
    if (resolvedHeading === null) {
      if (activeRoutePath.length >= 2) {
        resolvedHeading = calculateBearingDegrees(
          activeRoutePath[0],
          activeRoutePath[1]
        );
      } else if (routeOrigin && routeDestination) {
        resolvedHeading = calculateBearingDegrees(routeOrigin, routeDestination);
      } else {
        resolvedHeading = 0;
      }
    }

    // Rotate map smoothly to align with heading ("My View") when enabled
    if (isAlignToHeading && effectivePos) {
      const targetBearing = ((360 - resolvedHeading) % 360 + 360) % 360;
      const currentBearing = ((map.getBearing() % 360) + 360) % 360;
      const diff = Math.abs(((targetBearing - currentBearing + 540) % 360) - 180);
      if (diff > 2) {
        map.setBearing(targetBearing, { animate: true, duration: 0.35 });
      }
    }

    if (!effectivePos) {
      if (navCursorMarkerRef.current) {
        navGroup.clearLayers();
        navCursorMarkerRef.current = null;
      }
      return;
    }

    const screenAngle = (resolvedHeading + mapBearing) % 360;
    const icon = createNavigationCursorIcon(screenAngle, isNavigating);
    const markerTitle = isNavigating
      ? 'Live Navigation Cursor (Your Current Location)'
      : 'Starting Position Cursor';

    if (!navCursorMarkerRef.current) {
      const cursorMarker = L.marker([effectivePos.lat, effectivePos.lng], {
        icon,
        title: markerTitle,
        zIndexOffset: 900,
      }).addTo(navGroup);
      navCursorMarkerRef.current = cursorMarker;
    } else {
      navCursorMarkerRef.current.setLatLng([effectivePos.lat, effectivePos.lng]);
      navCursorMarkerRef.current.setIcon(icon);
    }

    const posChanged =
      !lastPanPosRef.current ||
      lastPanPosRef.current.lat !== effectivePos.lat ||
      lastPanPosRef.current.lng !== effectivePos.lng;

    if (isNavigating && followCursor && posChanged) {
      lastPanPosRef.current = effectivePos;
      map.panTo([effectivePos.lat, effectivePos.lng], {
        animate: true,
        duration: 0.45,
      });
    }
  }, [
    navigationPosition?.lat,
    navigationPosition?.lng,
    navigationHeading,
    isNavigating,
    followCursor,
    isAlignToHeading,
    mapBearing,
    routeOrigin?.lat,
    routeOrigin?.lng,
    routeDestination?.lat,
    routeDestination?.lng,
    computedRoutes,
    selectedRouteIndex,
  ]);

  const rotateBy = (deltaDeg: number) => {
    const map = mapRef.current;
    if (!map) return;
    setAlignToHeading(false);
    const next = ((map.getBearing() + deltaDeg) % 360 + 360) % 360;
    map.setBearing(next, { animate: true, duration: 0.28 });
    setMapBearing(Math.round(next));
  };

  const resetNorth = () => {
    const map = mapRef.current;
    if (!map) return;
    setAlignToHeading(false);
    map.resetNorth({ animate: true, duration: 0.35 });
    setMapBearing(0);
  };

  const handleRotateViewButton = () => {
    const map = mapRef.current;
    if (!map) return;
    const hasHeadingTarget = Boolean(
      navigationPosition || routeOrigin || routeDestination
    );
    if (hasHeadingTarget) {
      const next = !isAlignToHeading;
      setAlignToHeading(next);
      if (!next) {
        map.resetNorth({ animate: true, duration: 0.35 });
        setMapBearing(0);
      }
      return;
    }
    // On general maps without a route, rotate 45 deg clockwise per click
    rotateBy(45);
  };

  const hasRouteCursor = Boolean(
    navigationPosition || routeOrigin || routeDestination
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className={`relative isolate w-full ${heightClass}`}>
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{ cursor: onMapClick || onPickerChange ? 'crosshair' : 'grab' }}
        />

        {interactiveHint && (
          <div className="pointer-events-none absolute left-3 top-3 z-[450] rounded-lg border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
            {interactiveHint}
          </div>
        )}

        {activeHazard && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-14 left-3 z-[460] sm:bottom-auto sm:left-auto sm:right-3 sm:top-3"
          >
            <HazardInfoCard
              hazard={activeHazard}
              onClose={() => setActiveHazard(null)}
            />
          </div>
        )}

        {/* Map Rotation Controls (Rotate Left, Compass/Reset North, Rotate Right, My View) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-8 right-14 z-[450] flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={handleRotateViewButton}
            title={
              hasRouteCursor
                ? 'Rotate map to match your travel view (Heading-Up)'
                : 'Rotate map view by 45°'
            }
            aria-label="Rotate map to my view"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
              isAlignToHeading
                ? 'border-[#2563EB] bg-[#2563EB] text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Compass
              size={14}
              style={{
                transform: `rotate(${mapBearing}deg)`,
                transition: 'transform 200ms ease',
              }}
            />
            <span>{isAlignToHeading ? 'My View: On' : 'Rotate View'}</span>
          </button>

          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => rotateBy(-45)}
              title="Rotate map counter-clockwise (-45°)"
              aria-label="Rotate map left"
              className="border-r border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={resetNorth}
              title="Reset map orientation to North (0°)"
              aria-label="Reset map north"
              className="border-r border-slate-200 px-2 py-2 font-mono text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {mapBearing === 0 ? 'N' : `${mapBearing}°`}
            </button>
            <button
              type="button"
              onClick={() => rotateBy(45)}
              title="Rotate map clockwise (+45°)"
              aria-label="Rotate map right"
              className="p-2 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* Map Zoom & Recenter Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-8 right-3 z-[450] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Zoom in"
            className="border-b border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Zoom out"
            className="border-b border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Minus size={15} />
          </button>
          <LocateControl center={center} userLocation={userLocation} mapRef={mapRef} />
        </div>

        {/* Coordinates Badge */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[450] rounded-md border border-slate-200/90 bg-white/90 px-2.5 py-1 font-mono text-[11px] text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
          {formatCoords(viewCenter)} · Zoom {currentZoom}
          {mapBearing !== 0 ? ` · ${mapBearing}°` : ''}
        </div>
      </div>
    </div>
  );
};
