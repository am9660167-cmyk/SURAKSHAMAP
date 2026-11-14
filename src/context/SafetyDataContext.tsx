import React, { createContext, useContext, useEffect, useState } from 'react';
import { INITIAL_HAZARDS } from '../data/hazards';
import { INITIAL_NOTIFICATIONS } from '../data/notifications';
import { supabase } from '../lib/supabase';
import {
  Coordinates,
  HazardCategory,
  HazardReport,
  HazardSeverity,
  JourneyRequest,
  NotificationItem,
  ReportStatus,
  UserSettings,
} from '../types/safety';
import { simulateAiVerification } from '../utils/hazardHelpers';
import {
  DEFAULT_MAP_CENTER,
  detectApproximateNetworkPosition,
  detectPositionWithSource,
} from '../utils/location';
import { useAuth } from './AuthContext';

const HAZARDS_KEY = 'surakshamap_hazards_v1';
const NOTIFICATIONS_KEY = 'surakshamap_notifications_v1';
const SETTINGS_KEY = 'surakshamap_settings_v1';
const JOURNEY_KEY = 'surakshamap_journey_v1';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  nearbyAlerts: true,
  criticalAlerts: true,
  verifiedUpdates: true,
  locationPermission: 'prompt',
  shareApproximateLocation: true,
  anonymousReporting: false,
  alertRadiusKm: 5,
};

interface AddHazardInput {
  title: string;
  category: HazardCategory;
  description: string;
  severity: HazardSeverity;
  location: Coordinates;
  address: string;
  photoUrl?: string;
  photoName?: string;
  reportedBy: string;
  reporterId: string;
}

interface SafetyDataContextValue {
  hazards: HazardReport[];
  notifications: NotificationItem[];
  unreadCount: number;
  settings: UserSettings;
  userLocation: Coordinates;
  hasDetectedGps: boolean;
  gpsStatus: 'idle' | 'detecting' | 'granted' | 'denied' | 'error';
  gpsSource: 'default' | 'gps' | 'network';
  gpsNotice: string | null;
  gpsError: string | null;
  journeyRequest: JourneyRequest;
  detectUserLocation: () => Promise<Coordinates | null>;
  useApproximateLocation: () => Promise<Coordinates | null>;
  addHazardReport: (input: AddHazardInput) => HazardReport;
  confirmHazard: (hazardId: string, userId: string) => void;
  reportNotPresent: (hazardId: string, userId: string) => void;
  updateHazardStatus: (hazardId: string, status: ReportStatus) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  toggleTheme: () => void;
  setJourneyRequest: (req: JourneyRequest) => void;
  resetDemoData: () => void;
}

const DEFAULT_JOURNEY: JourneyRequest = {
  originLabel: 'Majestic Transit Hub',
  originCoords: { lat: 12.9767, lng: 77.5713 },
  destinationLabel: 'Indiranagar 100 Feet Road',
  destinationCoords: { lat: 12.9784, lng: 77.6408 },
  travelMode: 'DRIVING',
};

const SafetyDataContext = createContext<SafetyDataContextValue | undefined>(undefined);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapDbHazardToModel(row: Record<string, unknown>): HazardReport {
  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category as HazardCategory,
    description: String(row.description),
    severity: row.severity as HazardSeverity,
    status: row.status as ReportStatus,
    location: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    address: String(row.address),
    photoUrl: (row.photo_url as string | null) ?? undefined,
    reportedAt: String(row.reported_at),
    reportedBy: String(row.reported_by),
    reporterId: String(row.reporter_id),
    confirmations: Number(row.confirmations ?? 1),
    notPresentReports: Number(row.not_present_reports ?? 0),
    confirmedByUserIds: Array.isArray(row.confirmed_by_user_ids)
      ? (row.confirmed_by_user_ids as string[])
      : [],
    notPresentByUserIds: Array.isArray(row.not_present_by_user_ids)
      ? (row.not_present_by_user_ids as string[])
      : [],
    trustScore: Number(row.trust_score ?? 75),
    aiVerification:
      (row.ai_verification as HazardReport['aiVerification'] | undefined) ??
      undefined,
  };
}

function mapHazardToDbRow(h: HazardReport) {
  return {
    id: h.id,
    title: h.title,
    category: h.category,
    description: h.description,
    severity: h.severity,
    status: h.status,
    lat: h.location.lat,
    lng: h.location.lng,
    address: h.address,
    photo_url: h.photoUrl ?? null,
    reported_at: h.reportedAt,
    reported_by: h.reportedBy,
    reporter_id: h.reporterId,
    confirmations: h.confirmations,
    not_present_reports: h.notPresentReports,
    confirmed_by_user_ids: h.confirmedByUserIds,
    not_present_by_user_ids: h.notPresentByUserIds,
    trust_score: h.trustScore,
    ai_verification: h.aiVerification ?? null,
  };
}

function mapDbNotificationToModel(row: Record<string, unknown>): NotificationItem {
  return {
    id: String(row.id),
    type: row.type as NotificationItem['type'],
    title: String(row.title),
    message: String(row.message),
    hazardId: (row.hazard_id as string | null) ?? undefined,
    createdAt: String(row.created_at),
    read: Boolean(row.read),
    severity: (row.severity as HazardSeverity | null) ?? undefined,
  };
}

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const SafetyDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  const [hazards, setHazards] = useState<HazardReport[]>(() =>
    loadFromStorage(HAZARDS_KEY, INITIAL_HAZARDS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadFromStorage(NOTIFICATIONS_KEY, INITIAL_NOTIFICATIONS)
  );
  const [settings, setSettings] = useState<UserSettings>(() =>
    loadFromStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  );
  const [journeyRequest, setJourneyRequestState] = useState<JourneyRequest>(() =>
    loadFromStorage(JOURNEY_KEY, DEFAULT_JOURNEY)
  );

  const [userLocation, setUserLocation] = useState<Coordinates>(DEFAULT_MAP_CENTER);
  const [hasDetectedGps, setHasDetectedGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'detecting' | 'granted' | 'denied' | 'error'
  >('idle');
  const [gpsSource, setGpsSource] = useState<'default' | 'gps' | 'network'>('default');
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(HAZARDS_KEY, JSON.stringify(hazards));
    } catch {
      // Ignore quota
    }
  }, [hazards]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch {
      // Ignore quota
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(JOURNEY_KEY, JSON.stringify(journeyRequest));
    } catch {
      // Ignore quota
    }
  }, [journeyRequest]);

  // Sync hazards and notifications from Supabase on startup
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const loadSupabaseSafetyData = async () => {
      const { data: hazRows, error: hazErr } = await client
        .from('hazard_reports')
        .select('*')
        .order('reported_at', { ascending: false });

      if (!active) return;

      if (!hazErr && Array.isArray(hazRows)) {
        if (hazRows.length > 0) {
          setHazards(hazRows.map((r) => mapDbHazardToModel(r as Record<string, unknown>)));
        } else {
          // Seed initial hazards into empty Supabase table once
          await client
            .from('hazard_reports')
            .upsert(INITIAL_HAZARDS.map(mapHazardToDbRow), { onConflict: 'id' });
        }
      }

      const { data: notifRows, error: notifErr } = await client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!active) return;

      if (!notifErr && Array.isArray(notifRows)) {
        if (notifRows.length > 0) {
          setNotifications(
            notifRows.map((n) => mapDbNotificationToModel(n as Record<string, unknown>))
          );
        } else {
          await client.from('notifications').upsert(
            INITIAL_NOTIFICATIONS.map((n) => ({
              id: n.id,
              user_id: null,
              type: n.type,
              title: n.title,
              message: n.message,
              hazard_id: n.hazardId ?? null,
              severity: n.severity ?? null,
              read: n.read,
              created_at: n.createdAt,
            })),
            { onConflict: 'id' }
          );
        }
      }
    };

    void loadSupabaseSafetyData();
    return () => {
      active = false;
    };
  }, []);

  // Load user-specific settings from Supabase when signed in
  useEffect(() => {
    if (!supabase || !user || !isUuid(user.id)) return;
    let active = true;

    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        setSettings({
          theme: data.theme === 'dark' ? 'dark' : 'light',
          nearbyAlerts: Boolean(data.nearby_alerts),
          criticalAlerts: Boolean(data.critical_alerts),
          verifiedUpdates: Boolean(data.verified_updates),
          locationPermission:
            (data.location_permission as UserSettings['locationPermission']) ??
            'prompt',
          shareApproximateLocation: Boolean(data.share_approximate_location),
          anonymousReporting: Boolean(data.anonymous_reporting),
          alertRadiusKm: Number(data.alert_radius_km ?? 5),
        });
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const persistSettingsToSupabase = (next: UserSettings) => {
    if (!supabase || !user || !isUuid(user.id)) return;
    void supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        theme: next.theme,
        nearby_alerts: next.nearbyAlerts,
        critical_alerts: next.criticalAlerts,
        verified_updates: next.verifiedUpdates,
        location_permission: next.locationPermission,
        share_approximate_location: next.shareApproximateLocation,
        anonymous_reporting: next.anonymousReporting,
        alert_radius_km: next.alertRadiusKm,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  };

  const detectUserLocation = async (): Promise<Coordinates | null> => {
    setGpsStatus('detecting');
    setGpsError(null);
    setGpsNotice(null);
    try {
      const result = await detectPositionWithSource();
      setUserLocation(result.coords);
      setHasDetectedGps(true);
      setGpsStatus('granted');
      setGpsSource(result.source);
      setGpsNotice(result.notice ?? null);
      setSettings((prev) => {
        const next: UserSettings = { ...prev, locationPermission: 'granted' };
        persistSettingsToSupabase(next);
        return next;
      });
      return result.coords;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to detect GPS coordinates.';
      const isDenied = msg.toLowerCase().includes('denied');
      setGpsStatus(isDenied ? 'denied' : 'error');
      setGpsError(msg);
      if (isDenied) {
        setSettings((prev) => {
          const next: UserSettings = { ...prev, locationPermission: 'denied' };
          persistSettingsToSupabase(next);
          return next;
        });
      }
      return null;
    }
  };

  const useApproximateLocation = async (): Promise<Coordinates | null> => {
    setGpsStatus('detecting');
    setGpsError(null);
    try {
      const coords = await detectApproximateNetworkPosition();
      setUserLocation(coords);
      setHasDetectedGps(true);
      setGpsStatus('granted');
      setGpsSource('network');
      setGpsNotice(
        'Centered using approximate network location. Drag the map pin or search to set your exact street.'
      );
      return coords;
    } catch {
      setGpsStatus('error');
      setGpsError('Could not retrieve approximate network location.');
      return null;
    }
  };

  // Automatically read GPS on load if browser permission was already granted
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') {
          void detectUserLocation();
        }
      })
      .catch(() => undefined);
  }, []);

  const addHazardReport = (input: AddHazardInput): HazardReport => {
    const aiVerification = simulateAiVerification({
      title: input.title,
      description: input.description,
      selectedCategory: input.category,
      hasPhoto: Boolean(input.photoUrl),
      photoName: input.photoName,
      location: input.location,
      existingReports: hazards,
    });

    const newHazard: HazardReport = {
      id: `haz-${Date.now()}`,
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      severity: input.severity,
      status: 'Pending',
      location: input.location,
      address:
        input.address.trim() ||
        `${input.location.lat.toFixed(5)}, ${input.location.lng.toFixed(5)}`,
      photoUrl: input.photoUrl,
      reportedAt: new Date().toISOString(),
      reportedBy: settings.anonymousReporting ? 'Community Member' : input.reportedBy,
      reporterId: input.reporterId,
      confirmations: 1,
      notPresentReports: 0,
      confirmedByUserIds: [input.reporterId],
      notPresentByUserIds: [],
      trustScore: input.photoUrl ? 82 : 70,
      aiVerification,
    };

    setHazards((prev) => [newHazard, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type: input.severity === 'Critical' ? 'Critical Hazard Alert' : 'New Report',
      title: `${input.severity} ${input.category} reported`,
      message: `${newHazard.title} at ${newHazard.address}.`,
      hazardId: newHazard.id,
      createdAt: new Date().toISOString(),
      read: false,
      severity: input.severity,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    if (supabase) {
      void supabase.from('hazard_reports').insert(mapHazardToDbRow(newHazard));
      void supabase.from('notifications').insert({
        id: newNotif.id,
        user_id: user && isUuid(user.id) ? user.id : null,
        type: newNotif.type,
        title: newNotif.title,
        message: newNotif.message,
        hazard_id: newNotif.hazardId ?? null,
        severity: newNotif.severity ?? null,
        read: false,
        created_at: newNotif.createdAt,
      });
    }

    return newHazard;
  };

  const confirmHazard = (hazardId: string, userId: string) => {
    setHazards((prev) =>
      prev.map((h) => {
        if (h.id !== hazardId) return h;
        if (h.confirmedByUserIds.includes(userId)) return h;
        const confirmations = h.confirmations + 1;
        const trustScore = Math.min(99, h.trustScore + 3);
        const nextStatus: ReportStatus =
          h.status === 'Pending' && confirmations >= 3 ? 'Verified' : h.status;
        const updated: HazardReport = {
          ...h,
          confirmations,
          trustScore,
          status: nextStatus,
          confirmedByUserIds: [...h.confirmedByUserIds, userId],
        };
        if (supabase) {
          void supabase
            .from('hazard_reports')
            .update({
              confirmations: updated.confirmations,
              trust_score: updated.trustScore,
              status: updated.status,
              confirmed_by_user_ids: updated.confirmedByUserIds,
            })
            .eq('id', hazardId);
        }
        return updated;
      })
    );
  };

  const reportNotPresent = (hazardId: string, userId: string) => {
    setHazards((prev) =>
      prev.map((h) => {
        if (h.id !== hazardId) return h;
        if (h.notPresentByUserIds.includes(userId)) return h;
        const notPresentReports = h.notPresentReports + 1;
        const trustScore = Math.max(15, h.trustScore - 8);
        const nextStatus: ReportStatus =
          notPresentReports >= 3 && notPresentReports > h.confirmations / 2
            ? 'Resolved'
            : h.status;
        const updated: HazardReport = {
          ...h,
          notPresentReports,
          trustScore,
          status: nextStatus,
          notPresentByUserIds: [...h.notPresentByUserIds, userId],
        };
        if (supabase) {
          void supabase
            .from('hazard_reports')
            .update({
              not_present_reports: updated.notPresentReports,
              trust_score: updated.trustScore,
              status: updated.status,
              not_present_by_user_ids: updated.notPresentByUserIds,
            })
            .eq('id', hazardId);
        }
        return updated;
      })
    );
  };

  const updateHazardStatus = (hazardId: string, status: ReportStatus) => {
    let targetTitle = '';
    setHazards((prev) =>
      prev.map((h) => {
        if (h.id !== hazardId) return h;
        targetTitle = h.title;
        const nextTrust =
          status === 'Verified'
            ? Math.max(h.trustScore, 90)
            : status === 'Rejected'
            ? 20
            : h.trustScore;
        if (supabase) {
          void supabase
            .from('hazard_reports')
            .update({ status, trust_score: nextTrust })
            .eq('id', hazardId);
        }
        return {
          ...h,
          status,
          trustScore: nextTrust,
        };
      })
    );

    if (status === 'Verified' || status === 'Resolved') {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        type: status === 'Verified' ? 'Verified Report' : 'Resolved Report',
        title: `Report marked ${status}`,
        message: `"${targetTitle || 'Community hazard report'}" status updated to ${status}.`,
        hazardId,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);

      if (supabase) {
        void supabase.from('notifications').insert({
          id: notif.id,
          user_id: null,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          hazard_id: hazardId,
          severity: null,
          read: false,
          created_at: notif.createdAt,
        });
      }
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (supabase) {
      void supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (supabase) {
      void supabase.from('notifications').update({ read: true }).eq('read', false);
    }
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      persistSettingsToSupabase(next);
      return next;
    });
  };

  const toggleTheme = () => {
    setSettings((prev) => {
      const next: UserSettings = {
        ...prev,
        theme: prev.theme === 'dark' ? 'light' : 'dark',
      };
      persistSettingsToSupabase(next);
      return next;
    });
  };

  const setJourneyRequest = (req: JourneyRequest) => {
    setJourneyRequestState(req);
  };

  const resetDemoData = () => {
    setHazards(INITIAL_HAZARDS);
    setNotifications(INITIAL_NOTIFICATIONS);
    if (supabase) {
      void supabase
        .from('hazard_reports')
        .upsert(INITIAL_HAZARDS.map(mapHazardToDbRow), { onConflict: 'id' });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafetyDataContext.Provider
      value={{
        hazards,
        notifications,
        unreadCount,
        settings,
        userLocation,
        hasDetectedGps,
        gpsStatus,
        gpsSource,
        gpsNotice,
        gpsError,
        journeyRequest,
        detectUserLocation,
        useApproximateLocation,
        addHazardReport,
        confirmHazard,
        reportNotPresent,
        updateHazardStatus,
        markNotificationRead,
        markAllNotificationsRead,
        updateSettings,
        toggleTheme,
        setJourneyRequest,
        resetDemoData,
      }}
    >
      {children}
    </SafetyDataContext.Provider>
  );
};

export function useSafetyData(): SafetyDataContextValue {
  const ctx = useContext(SafetyDataContext);
  if (!ctx) {
    throw new Error('useSafetyData must be used inside a SafetyDataProvider');
  }
  return ctx;
}
