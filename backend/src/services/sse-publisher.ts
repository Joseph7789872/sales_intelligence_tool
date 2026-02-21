import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { sseChannelForUser, type SSEEvent } from '../types/sse.js';

// Lazy-initialized publisher (separate from main Redis client)
let publisher: IORedis | null = null;

function getPublisher(): IORedis {
  if (!publisher) {
    publisher = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy(times) {
        if (times === 1) {
          console.warn('[redis:sse-publisher] Connection failed — retrying in background...');
        }
        return Math.min(times * 500, 30_000);
      },
    });
    publisher.on('error', () => {
      // Suppress — retryStrategy handles reconnection
    });
    publisher.connect().catch(() => {
      // Suppress initial connection failure — will retry
    });
  }
  return publisher;
}

export async function publishSSEEvent(userId: string, event: SSEEvent): Promise<void> {
  try {
    const channel = sseChannelForUser(userId);
    const message = JSON.stringify(event);
    await getPublisher().publish(channel, message);
  } catch {
    // Suppress publish errors when Redis is unavailable
  }
}

export async function closePublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
  }
}
