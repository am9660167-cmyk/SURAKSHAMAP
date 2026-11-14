import dotenv from 'dotenv';
if (process.env.VITE_SUPABASE_URL?.includes('YOUR_PROJECT_ID')) {
  delete process.env.VITE_SUPABASE_URL;
}
if (process.env.VITE_SUPABASE_ANON_KEY?.includes('YOUR_SUPABASE')) {
  delete process.env.VITE_SUPABASE_ANON_KEY;
}
dotenv.config();
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_HAZARDS } from './src/data/hazards.ts';
import { INITIAL_NOTIFICATIONS } from './src/data/notifications.ts';
import type {
  HazardReport,
  NotificationItem,
  ReportStatus,
  UserAccount,
} from './src/types/safety.ts';

interface SafetyStore {
  hazards: HazardReport[];
  notifications: NotificationItem[];
}

interface StoredUserRecord {
  user: UserAccount;
  salt: string;
  passwordHash: string;
}

interface UsersStore {
  users: StoredUserRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'safety-store.json');
const USERS_FILE = path.join(DATA_DIR, 'users-store.json');
const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_AVATAR = '/src/assets/images/avatar_citizen_profile_1794641736396.jpg';

function loadStore(): SafetyStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SafetyStore>;
      if (Array.isArray(parsed.hazards) && Array.isArray(parsed.notifications)) {
        return {
          hazards: parsed.hazards,
          notifications: parsed.notifications,
        };
      }
    }
  } catch {
    // Fall back to initial seed if store file is missing or corrupt
  }

  const seeded: SafetyStore = {
    hazards: [...INITIAL_HAZARDS],
    notifications: [...INITIAL_NOTIFICATIONS],
  };
  saveStore(seeded);
  return seeded;
}

function saveStore(next: SafetyStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(next, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch {
    // Ignore filesystem errors in read-only edge cases; in-memory state stays live
  }
}

function loadUsersStore(): UsersStore {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<UsersStore>;
      if (Array.isArray(parsed.users)) {
        return { users: parsed.users };
      }
    }
  } catch {
    // Initialize empty users store if missing or unreadable
  }
  const initial: UsersStore = { users: [] };
  saveUsersStore(initial);
  return initial;
}

function saveUsersStore(next: UsersStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${USERS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(next, null, 2), 'utf-8');
    fs.renameSync(tmpFile, USERS_FILE);
  } catch {
    // Ignore filesystem write errors in read-only edge cases
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualBuf = Buffer.from(hashPassword(password, salt), 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

let store: SafetyStore = loadStore();
let usersStore: UsersStore = loadUsersStore();
const sseClients = new Set<express.Response>();

function broadcastSync(): void {
  const payload = `event: sync\ndata: ${JSON.stringify(store)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  const getPublicSupabaseConfig = () => {
    const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const rawKey = (
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim();
    const url = rawUrl && !rawUrl.includes('YOUR_PROJECT_ID') ? rawUrl : '';
    const anonKey = rawKey && !rawKey.includes('YOUR_SUPABASE') ? rawKey : '';
    return { url, anonKey };
  };

  app.get('/api/env.js', (_req, res) => {
    const { url, anonKey } = getPublicSupabaseConfig();
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`window.__SUPABASE_ENV__ = ${JSON.stringify({ url, anonKey })};`);
  });

  app.get('/api/health', (_req, res) => {
    const { url, anonKey } = getPublicSupabaseConfig();
    res.json({ ok: true, supabaseConfigured: Boolean(url && anonKey) });
  });

  app.get('/api/auth/stats', (_req, res) => {
    res.json({ totalUsersCount: 1280 + usersStore.users.length });
  });

  app.post('/api/auth/signup', (req, res) => {
    const body = (req.body ?? {}) as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };
    const fullName = body.fullName?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const phone = body.phone?.trim() || undefined;
    const password = body.password ?? '';

    if (!fullName) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const exists = usersStore.users.some(
      (record) => record.user.email.toLowerCase() === email
    );
    if (exists) {
      res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const newUser: UserAccount = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fullName,
      email,
      phone,
      role: 'citizen',
      avatarUrl: DEFAULT_AVATAR,
      joinedAt: new Date().toISOString(),
    };

    usersStore = {
      users: [{ user: newUser, salt, passwordHash }, ...usersStore.users],
    };
    saveUsersStore(usersStore);

    res.status(201).json({
      user: newUser,
      totalUsersCount: 1280 + usersStore.users.length,
    });
  });

  app.post('/api/auth/signin', (req, res) => {
    const body = (req.body ?? {}) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      res.status(400).json({
        error: 'Please enter both your email address and password.',
      });
      return;
    }

    const found = usersStore.users.find(
      (record) => record.user.email.toLowerCase() === email
    );
    if (!found || !verifyPassword(password, found.salt, found.passwordHash)) {
      res.status(401).json({
        error: 'Invalid email or password. Please check your credentials and try again.',
      });
      return;
    }

    res.json({
      user: found.user,
      totalUsersCount: 1280 + usersStore.users.length,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const body = (req.body ?? {}) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? '';
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    res.json({
      ok: true,
      message: `If an account exists for ${email}, password reset instructions have been processed.`,
    });
  });

  app.patch('/api/auth/profile', (req, res) => {
    const body = (req.body ?? {}) as {
      id?: string;
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
      role?: 'citizen' | 'admin';
    };
    if (!body.id) {
      res.status(400).json({ error: 'Missing user id.' });
      return;
    }

    let updatedUser: UserAccount | null = null;
    const nextUsers = usersStore.users.map((record) => {
      if (record.user.id !== body.id) return record;
      updatedUser = {
        ...record.user,
        fullName: body.fullName !== undefined ? body.fullName : record.user.fullName,
        phone: body.phone !== undefined ? body.phone : record.user.phone,
        avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : record.user.avatarUrl,
        role: body.role !== undefined ? body.role : record.user.role,
      };
      return { ...record, user: updatedUser };
    });

    if (updatedUser) {
      usersStore = { users: nextUsers };
      saveUsersStore(usersStore);
    }

    res.json({ user: updatedUser });
  });

  app.get('/api/safety-data', (_req, res) => {
    res.json(store);
  });

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);
    res.write(`event: sync\ndata: ${JSON.stringify(store)}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  app.post('/api/hazards', (req, res) => {
    const body = req.body as {
      hazard?: HazardReport;
      notification?: NotificationItem;
    };
    const hazard = body?.hazard;
    if (!hazard || !hazard.id || !hazard.title) {
      res.status(400).json({ error: 'Invalid hazard payload' });
      return;
    }

    const exists = store.hazards.some((h) => h.id === hazard.id);
    const nextHazards = exists
      ? store.hazards.map((h) => (h.id === hazard.id ? hazard : h))
      : [hazard, ...store.hazards];

    let nextNotifications = store.notifications;
    if (body.notification && body.notification.id) {
      const notifExists = nextNotifications.some(
        (n) => n.id === body.notification!.id
      );
      if (!notifExists) {
        nextNotifications = [body.notification, ...nextNotifications];
      }
    }

    store = { hazards: nextHazards, notifications: nextNotifications };
    saveStore(store);
    broadcastSync();
    res.status(201).json(store);
  });

  app.patch('/api/hazards/:id/confirm', (req, res) => {
    const { id } = req.params;
    const { userId } = (req.body ?? {}) as { userId?: string };
    const actor = userId || 'guest-citizen';

    let changed = false;
    const nextHazards = store.hazards.map((h) => {
      if (h.id !== id) return h;
      if (h.confirmedByUserIds.includes(actor)) return h;
      changed = true;
      const confirmations = h.confirmations + 1;
      const trustScore = Math.min(99, h.trustScore + 3);
      const status: ReportStatus =
        h.status === 'Pending' && confirmations >= 3 ? 'Verified' : h.status;
      return {
        ...h,
        confirmations,
        trustScore,
        status,
        confirmedByUserIds: [...h.confirmedByUserIds, actor],
      };
    });

    if (changed) {
      store = { ...store, hazards: nextHazards };
      saveStore(store);
      broadcastSync();
    }
    res.json(store);
  });

  app.patch('/api/hazards/:id/not-present', (req, res) => {
    const { id } = req.params;
    const { userId } = (req.body ?? {}) as { userId?: string };
    const actor = userId || 'guest-citizen';

    let changed = false;
    let flaggedTitle: string | null = null;
    const nextHazards = store.hazards.map((h) => {
      if (h.id !== id) return h;
      if (h.notPresentByUserIds.includes(actor)) return h;
      changed = true;
      const notPresentReports = h.notPresentReports + 1;
      const trustScore = Math.max(15, h.trustScore - 8);
      // Only Admin can mark a hazard Resolved and remove it from the map
      if (notPresentReports === 3 && h.status !== 'Resolved') {
        flaggedTitle = h.title;
      }
      return {
        ...h,
        notPresentReports,
        trustScore,
        notPresentByUserIds: [...h.notPresentByUserIds, actor],
      };
    });

    let nextNotifications = store.notifications;
    if (flaggedTitle) {
      nextNotifications = [
        {
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'Nearby Hazard Alert',
          title: 'Hazard Flagged Cleared — Awaiting Admin',
          message: `Community members flagged "${flaggedTitle}" as cleared. Remains on map until Admin marks it Resolved.`,
          hazardId: id,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...nextNotifications,
      ];
    }

    if (changed) {
      store = { hazards: nextHazards, notifications: nextNotifications };
      saveStore(store);
      broadcastSync();
    }
    res.json(store);
  });

  app.patch('/api/hazards/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = (req.body ?? {}) as { status?: ReportStatus };
    if (!status) {
      res.status(400).json({ error: 'Missing status' });
      return;
    }

    let targetTitle = '';
    let found = false;
    const nextHazards = store.hazards.map((h) => {
      if (h.id !== id) return h;
      found = true;
      targetTitle = h.title;
      const trustScore =
        status === 'Verified'
          ? Math.max(h.trustScore, 90)
          : status === 'Rejected'
          ? 20
          : h.trustScore;
      return { ...h, status, trustScore };
    });

    if (!found) {
      res.status(404).json({ error: 'Hazard not found' });
      return;
    }

    let nextNotifications = store.notifications;
    if (status === 'Verified' || status === 'Resolved') {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: status === 'Verified' ? 'Verified Report' : 'Resolved Report',
        title:
          status === 'Verified'
            ? 'Report Approved by Admin'
            : 'Hazard Resolved & Removed from Map',
        message:
          status === 'Verified'
            ? `"${targetTitle}" has been approved and verified by Admin.`
            : `"${targetTitle}" has been marked Resolved by Admin and deleted from the live map.`,
        hazardId: id,
        createdAt: new Date().toISOString(),
        read: false,
      };
      nextNotifications = [notif, ...nextNotifications];
    }

    store = { hazards: nextHazards, notifications: nextNotifications };
    saveStore(store);
    broadcastSync();
    res.json(store);
  });

  app.delete('/api/hazards/:id', (req, res) => {
    const isAdminHeader = req.headers['x-suraksha-admin'] === 'true';
    const isAdminBody = Boolean((req.body as { isAdmin?: boolean } | undefined)?.isAdmin);
    if (!isAdminHeader && !isAdminBody) {
      res.status(403).json({
        error: 'Only Admin can remove reported hazards from the map.',
      });
      return;
    }

    const { id } = req.params;
    const nextHazards = store.hazards.filter((h) => h.id !== id);
    const nextNotifications = store.notifications.filter(
      (n) => n.hazardId !== id
    );
    store = { hazards: nextHazards, notifications: nextNotifications };
    saveStore(store);
    broadcastSync();
    res.json(store);
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    store = {
      ...store,
      notifications: store.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    };
    saveStore(store);
    broadcastSync();
    res.json(store);
  });

  app.patch('/api/notifications/read-all', (_req, res) => {
    store = {
      ...store,
      notifications: store.notifications.map((n) => ({ ...n, read: true })),
    };
    saveStore(store);
    broadcastSync();
    res.json(store);
  });

  app.post('/api/reset-demo', (_req, res) => {
    const demoIds = new Set(INITIAL_HAZARDS.map((h) => h.id));
    const userSubmitted = store.hazards.filter((h) => !demoIds.has(h.id));
    store = {
      hazards: [...userSubmitted, ...INITIAL_HAZARDS],
      notifications: [...INITIAL_NOTIFICATIONS],
    };
    saveStore(store);
    broadcastSync();
    res.json(store);
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SurakshaMap server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
