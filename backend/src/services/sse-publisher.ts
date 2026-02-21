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
    });
    publisher.connect();
  }
  return publisher;
}

export async function publishSSEEvent(userId: string, event: SSEEvent): Promise<void> {
  const channel = sseChannelForUser(userId);
  const message = JSON.stringify(event);
  await getPublisher().publish(channel, message);
}

export async function closePublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
  }
}
