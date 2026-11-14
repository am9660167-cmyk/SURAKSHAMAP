import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_HAZARDS } from './src/data/hazards.ts';
import { INITIAL_NOTIFICATIONS } from './src/data/notifications.ts';
import type {
  HazardReport,
  NotificationItem,
  ReportStatus,
} from './src/types/safety.ts';

interface SafetyStore {
  hazards: HazardReport[];
  notifications: NotificationItem[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'safety-store.json');
const PORT = Number(process.env.PORT) || 3000;

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
    fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch {
    // Ignore filesystem errors in read-only edge cases; in-memory state stays live
  }
}

let store: SafetyStore = loadStore();
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
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
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
    let resolvedTitle: string | null = null;
    const nextHazards = store.hazards.map((h) => {
      if (h.id !== id) return h;
      if (h.notPresentByUserIds.includes(actor)) return h;
      changed = true;
      const notPresentReports = h.notPresentReports + 1;
      const trustScore = Math.max(15, h.trustScore - 8);
      const status: ReportStatus =
        notPresentReports >= 3 && notPresentReports > h.confirmations / 2
          ? 'Resolved'
          : h.status;
      if (status === 'Resolved' && h.status !== 'Resolved') {
        resolvedTitle = h.title;
      }
      return {
        ...h,
        notPresentReports,
        trustScore,
        status,
        notPresentByUserIds: [...h.notPresentByUserIds, actor],
      };
    });

    let nextNotifications = store.notifications;
    if (resolvedTitle) {
      nextNotifications = [
        {
          id: `notif-${Date.now()}`,
          type: 'Resolved Report',
          title: 'Hazard Cleared & Removed from Map',
          message: `"${resolvedTitle}" was confirmed cleared by the community and removed from the map.`,
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
    store = {
      hazards: [...INITIAL_HAZARDS],
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
