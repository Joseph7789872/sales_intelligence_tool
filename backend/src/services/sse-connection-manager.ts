import type { Response } from 'express';
import { redisSubscriber } from '../config/redis.js';
import { sseChannelForUser, type SSEEvent } from '../types/sse.js';

// userId → Set of active Response objects (supports multiple tabs)
const connections = new Map<string, Set<Response>>();
const subscribedChannels = new Set<string>();

// ── Heartbeat ──────────────────────────────────

let heartbeatInterval: NodeJS.Timeout | null = null;
const HEARTBEAT_MS = 30_000;

function startHeartbeat(): void {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    for (const resSet of connections.values()) {
      for (const res of resSet) {
        res.write(':heartbeat\n\n');
      }
    }
  }, HEARTBEAT_MS);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ── Redis Subscriber ───────────────────────────

let subscriberInitialized = false;

function initSubscriber(): void {
  if (subscriberInitialized) return;
  subscriberInitialized = true;

  redisSubscriber.on('message', (channel: string, message: string) => {
    const prefix = 'sse:user:';
    if (!channel.startsWith(prefix)) return;
    const userId = channel.slice(prefix.length);

    const resSet = connections.get(userId);
    if (!resSet || resSet.size === 0) return;

    try {
      const event: SSEEvent = JSON.parse(message);
      const formatted = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
      for (const res of resSet) {
        res.write(formatted);
      }
    } catch {
      console.error('[SSE] Failed to parse Redis message:', message);
    }
  });
}

// ── Public API ─────────────────────────────────

export function addConnection(userId: string, res: Response): void {
  initSubscriber();

  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(res);

  // Subscribe to user's channel if not already subscribed
  const channel = sseChannelForUser(userId);
  if (!subscribedChannels.has(channel)) {
    redisSubscriber.subscribe(channel);
    subscribedChannels.add(channel);
  }

  startHeartbeat();
}

export function removeConnection(userId: string, res: Response): void {
  const resSet = connections.get(userId);
  if (!resSet) return;

  resSet.delete(res);

  if (resSet.size === 0) {
    connections.delete(userId);
    const channel = sseChannelForUser(userId);
    redisSubscriber.unsubscribe(channel);
    subscribedChannels.delete(channel);
  }

  if (connections.size === 0) {
    stopHeartbeat();
  }
}

export function closeAllConnections(): void {
  for (const [_userId, resSet] of connections) {
    for (const res of resSet) {
      res.end();
    }
  }
  connections.clear();

  for (const channel of subscribedChannels) {
    redisSubscriber.unsubscribe(channel);
  }
  subscribedChannels.clear();

  stopHeartbeat();
}

export function getActiveConnectionCount(): number {
  let count = 0;
  for (const resSet of connections.values()) {
    count += resSet.size;
  }
  return count;
}
