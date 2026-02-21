import IORedis from 'ioredis';
import { env } from './env.js';

let redisAvailable = false;

function createRedisClient(name: string): IORedis {
  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy(times) {
      if (times === 1) {
        console.warn(`[redis:${name}] Connection failed — retrying in background...`);
      }
      return Math.min(times * 500, 30_000);
    },
  });

  client.on('connect', () => {
    redisAvailable = true;
    console.log(`[redis:${name}] Connected.`);
  });

  client.on('error', () => {
    // Suppress per-attempt errors — retryStrategy handles logging
  });

  return client;
}

export const redis = createRedisClient('main');
export const redisSubscriber = createRedisClient('subscriber');

export function isRedisAvailable(): boolean {
  return redisAvailable;
}
