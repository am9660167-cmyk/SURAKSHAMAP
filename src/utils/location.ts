import { Coordinates } from '../types/safety';

export const DEFAULT_MAP_CENTER: Coordinates = {
  lat: 12.9716,
  lng: 77.5946,
};

export interface PresetPlace {
  id: string;
  name: string;
  address: string;
  coords: Coordinates;
}

export const PRESET_PLACES: PresetPlace[] = [
  {
    id: 'place-mg-road',
    name: 'MG Road Metro Corridor',
    address: 'Mahatma Gandhi Road, Central Business District',
    coords: { lat: 12.9756, lng: 77.6066 },
  },
  {
    id: 'place-indiranagar',
    name: 'Indiranagar 100 Feet Road',
    address: '100 Feet Road, Indiranagar',
    coords: { lat: 12.9784, lng: 77.6408 },
  },
  {
    id: 'place-koramangala',
    name: 'Koramangala Sony World Junction',
    address: '80 Feet Road, Koramangala 4th Block',
    coords: { lat: 12.9352, lng: 77.6245 },
  },
  {
    id: 'place-jayanagar',
    name: 'Jayanagar 4th Block Complex',
    address: '11th Main Road, Jayanagar 4th Block',
    coords: { lat: 12.9279, lng: 77.5838 },
  },
  {
    id: 'place-hebbal',
    name: 'Hebbal Flyover Interchange',
    address: 'Bellary Road, Hebbal',
    coords: { lat: 13.0358, lng: 77.5970 },
  },
  {
    id: 'place-majestic',
    name: 'Majestic Transit Hub',
    address: 'Kempegowda Bus Station, Gandhinagar',
    coords: { lat: 12.9767, lng: 77.5713 },
  },
  {
    id: 'place-whitefield',
    name: 'Whitefield ITPL Main Road',
    address: 'ITPL Main Road, Whitefield',
    coords: { lat: 12.9855, lng: 77.7363 },
  },
  {
    id: 'place-silkboard',
    name: 'Central Silk Board Junction',
    address: 'Outer Ring Road & Hosur Road',
    coords: { lat: 12.9177, lng: 77.6238 },
  },
];

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function distancePointToPolylineKm(
  point: Coordinates,
  path: Coordinates[]
): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return haversineDistanceKm(point, path[0]);

  let minKm = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const segDist = distanceToSegmentKm(point, path[i], path[i + 1]);
    if (segDist < minKm) minKm = segDist;
  }
  return minKm;
}

function distanceToSegmentKm(
  p: Coordinates,
  v: Coordinates,
  w: Coordinates
): number {
  const l2 = Math.pow(w.lat - v.lat, 2) + Math.pow(w.lng - v.lng, 2);
  if (l2 === 0) return haversineDistanceKm(p, v);
  let t =
    ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection: Coordinates = {
    lat: v.lat + t * (w.lat - v.lat),
    lng: v.lng + t * (w.lng - v.lng),
  };
  return haversineDistanceKm(p, projection);
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}

export function formatCoords(coords: Coordinates): string {
  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

export interface DetectedPositionResult {
  coords: Coordinates;
  source: 'gps' | 'network';
  notice?: string;
}

function getBrowserGeolocation(
  options: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export async function detectApproximateNetworkPosition(): Promise<Coordinates> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        latitude?: number;
        longitude?: number;
      };
      if (
        data.success !== false &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
      ) {
        return {
          lat: Number(data.latitude.toFixed(6)),
          lng: Number(data.longitude.toFixed(6)),
        };
      }
    }
  } catch {
    // Try secondary IP geolocation provider
  } finally {
    clearTimeout(timer);
  }

  const backupController = new AbortController();
  const backupTimer = setTimeout(() => backupController.abort(), 5000);
  try {
    const res2 = await fetch('https://ipapi.co/json/', {
      signal: backupController.signal,
    });
    if (res2.ok) {
      const data2 = (await res2.json()) as {
        latitude?: number;
        longitude?: number;
      };
      if (
        typeof data2.latitude === 'number' &&
        typeof data2.longitude === 'number'
      ) {
        return {
          lat: Number(data2.latitude.toFixed(6)),
          lng: Number(data2.longitude.toFixed(6)),
        };
      }
    }
  } finally {
    clearTimeout(backupTimer);
  }

  throw new Error('Unable to detect approximate network location.');
}

export async function detectPositionWithSource(): Promise<DetectedPositionResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    const coords = await detectApproximateNetworkPosition();
    return {
      coords,
      source: 'network',
      notice:
        'Browser GPS is unavailable; centered using approximate network location.',
    };
  }

  try {
    const pos = await getBrowserGeolocation({
      enableHighAccuracy: true,
      timeout: 5500,
      maximumAge: 60000,
    });
    return {
      coords: {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
      },
      source: 'gps',
    };
  } catch (err) {
    const geoErr = err as GeolocationPositionError | Error;
    const code = 'code' in geoErr ? geoErr.code : 0;
    const msg = (geoErr.message || '').toLowerCase();
    const isPolicyBlocked =
      msg.includes('permissions policy') ||
      msg.includes('disabled in this document') ||
      msg.includes('secure origin');

    // Code 1 = PERMISSION_DENIED (unless blocked by iframe permissions policy)
    if (code === 1 && !isPolicyBlocked) {
      throw new Error(
        'Location permission was denied. Enable browser location access or select manually.'
      );
    }

    // Retry once with network/Wi-Fi accuracy before falling back to IP lookup
    if (!isPolicyBlocked) {
      try {
        const lowAccPos = await getBrowserGeolocation({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        });
        return {
          coords: {
            lat: Number(lowAccPos.coords.latitude.toFixed(6)),
            lng: Number(lowAccPos.coords.longitude.toFixed(6)),
          },
          source: 'gps',
        };
      } catch (retryErr) {
        const retryGeo = retryErr as GeolocationPositionError | Error;
        const retryCode = 'code' in retryGeo ? retryGeo.code : 0;
        const retryMsg = (retryGeo.message || '').toLowerCase();
        if (retryCode === 1 && !retryMsg.includes('permissions policy')) {
          throw new Error(
            'Location permission was denied. Enable browser location access or select manually.'
          );
        }
      }
    }

    // Final fallback: approximate network/IP location (useful in iframes & desktops without GPS)
    const fallbackCoords = await detectApproximateNetworkPosition();
    return {
      coords: fallbackCoords,
      source: 'network',
      notice: isPolicyBlocked
        ? 'Embedded preview restricts browser GPS; using approximate network location. Drag pin or search to refine.'
        : 'Device GPS timed out; using approximate network location. Drag pin or search to refine.',
    };
  }
}

export async function detectCurrentPosition(): Promise<Coordinates> {
  const res = await detectPositionWithSource();
  return res.coords;
}

export async function reverseGeocodeOsm(coords: Coordinates): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      name?: string;
      address?: {
        road?: string;
        suburb?: string;
        neighbourhood?: string;
        city?: string;
        town?: string;
      };
    };
    const parts = [
      data.name || data.address?.road,
      data.address?.neighbourhood || data.address?.suburb,
      data.address?.city || data.address?.town,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(', ').trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function buildSimulatedRoutePaths(
  origin: Coordinates,
  destination: Coordinates
): { primary: Coordinates[]; alternative: Coordinates[] } {
  const steps = 14;
  const primary: Coordinates[] = [];
  const alternative: Coordinates[] = [];

  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const perpLat = -dLng;
  const perpLng = dLat;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wave1 = Math.sin(t * Math.PI) * 0.08;
    const wave2 = Math.sin(t * Math.PI) * -0.18;

    primary.push({
      lat: origin.lat + dLat * t + perpLat * wave1,
      lng: origin.lng + dLng * t + perpLng * wave1,
    });
    alternative.push({
      lat: origin.lat + dLat * t + perpLat * wave2,
      lng: origin.lng + dLng * t + perpLng * wave2,
    });
  }

  return { primary, alternative };
}

export function calculateBearingDeg(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Number.isFinite(bearing) ? bearing : 0;
}

export function getPathTotalKm(path: Coordinates[]): number {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += haversineDistanceKm(path[i], path[i + 1]);
  }
  return total;
}

export interface InterpolatedPathState {
  position: Coordinates;
  headingDeg: number;
  traveledPath: Coordinates[];
  remainingPath: Coordinates[];
  traveledKm: number;
  remainingKm: number;
  totalKm: number;
  progress01: number;
}

export function interpolateAlongPath(
  path: Coordinates[],
  rawProgress01: number
): InterpolatedPathState {
  if (path.length === 0) {
    const fallback = DEFAULT_MAP_CENTER;
    return {
      position: fallback,
      headingDeg: 0,
      traveledPath: [fallback],
      remainingPath: [fallback],
      traveledKm: 0,
      remainingKm: 0,
      totalKm: 0,
      progress01: 0,
    };
  }
  if (path.length === 1) {
    return {
      position: path[0],
      headingDeg: 0,
      traveledPath: [path[0]],
      remainingPath: [path[0]],
      traveledKm: 0,
      remainingKm: 0,
      totalKm: 0,
      progress01: 1,
    };
  }

  const progress01 = Math.max(0, Math.min(1, rawProgress01));
  const segLengths: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = haversineDistanceKm(path[i], path[i + 1]);
    segLengths.push(d);
    totalKm += d;
  }

  if (totalKm <= 0.0001) {
    const headingDeg = calculateBearingDeg(path[0], path[path.length - 1]);
    return {
      position: path[0],
      headingDeg,
      traveledPath: [path[0]],
      remainingPath: path,
      traveledKm: 0,
      remainingKm: 0,
      totalKm: 0,
      progress01,
    };
  }

  const targetKm = totalKm * progress01;
  let accumulatedKm = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segKm = segLengths[i];
    const start = path[i];
    const end = path[i + 1];

    if (accumulatedKm + segKm >= targetKm || i === segLengths.length - 1) {
      const localFraction =
        segKm > 0 ? Math.max(0, Math.min(1, (targetKm - accumulatedKm) / segKm)) : 0;
      const position: Coordinates = {
        lat: Number((start.lat + (end.lat - start.lat) * localFraction).toFixed(6)),
        lng: Number((start.lng + (end.lng - start.lng) * localFraction).toFixed(6)),
      };
      const headingDeg = calculateBearingDeg(start, end);
      const traveledPath = [...path.slice(0, i + 1), position];
      const remainingPath = [position, ...path.slice(i + 1)];

      return {
        position,
        headingDeg,
        traveledPath,
        remainingPath,
        traveledKm: targetKm,
        remainingKm: Math.max(0, totalKm - targetKm),
        totalKm,
        progress01,
      };
    }
    accumulatedKm += segKm;
  }

  const lastHeading = calculateBearingDeg(path[path.length - 2], path[path.length - 1]);
  return {
    position: path[path.length - 1],
    headingDeg: lastHeading,
    traveledPath: path,
    remainingPath: [path[path.length - 1]],
    traveledKm: totalKm,
    remainingKm: 0,
    totalKm,
    progress01: 1,
  };
}

export function projectPointOntoPath(
  point: Coordinates,
  path: Coordinates[]
): {
  progress01: number;
  distanceFromRouteKm: number;
  headingDeg: number;
  closestPoint: Coordinates;
} {
  if (path.length < 2) {
    return {
      progress01: 0,
      distanceFromRouteKm: path[0] ? haversineDistanceKm(point, path[0]) : 0,
      headingDeg: 0,
      closestPoint: path[0] ?? point,
    };
  }

  const segLengths: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = haversineDistanceKm(path[i], path[i + 1]);
    segLengths.push(d);
    totalKm += d;
  }

  let bestDistKm = Infinity;
  let bestProgressKm = 0;
  let bestHeading = calculateBearingDeg(path[0], path[1]);
  let bestClosest = path[0];
  let accKm = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const v = path[i];
    const w = path[i + 1];
    const l2 = Math.pow(w.lat - v.lat, 2) + Math.pow(w.lng - v.lng, 2);
    let t = 0;
    if (l2 > 0) {
      t = ((point.lat - v.lat) * (w.lat - v.lat) + (point.lng - v.lng) * (w.lng - v.lng)) / l2;
      t = Math.max(0, Math.min(1, t));
    }
    const proj: Coordinates = {
      lat: v.lat + t * (w.lat - v.lat),
      lng: v.lng + t * (w.lng - v.lng),
    };
    const dKm = haversineDistanceKm(point, proj);
    if (dKm < bestDistKm) {
      bestDistKm = dKm;
      bestProgressKm = accKm + segLengths[i] * t;
      bestHeading = calculateBearingDeg(v, w);
      bestClosest = proj;
    }
    accKm += segLengths[i];
  }

  return {
    progress01: totalKm > 0 ? Math.max(0, Math.min(1, bestProgressKm / totalKm)) : 0,
    distanceFromRouteKm: bestDistKm,
    headingDeg: bestHeading,
    closestPoint: bestClosest,
  };
}

export function watchLiveGpsPosition(
  onUpdate: (coords: Coordinates, headingDeg: number | null, speedMps: number | null) => void,
  onError?: (message: string) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.('Browser geolocation is unavailable.');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const coords: Coordinates = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
      };
      const heading =
        typeof pos.coords.heading === 'number' && Number.isFinite(pos.coords.heading)
          ? pos.coords.heading
          : null;
      const speed =
        typeof pos.coords.speed === 'number' && Number.isFinite(pos.coords.speed)
          ? pos.coords.speed
          : null;
      onUpdate(coords, heading, speed);
    },
    (err) => {
      onError?.(err.message || 'Unable to track continuous GPS.');
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1500,
      timeout: 10000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

