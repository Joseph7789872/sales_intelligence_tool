import crypto from 'node:crypto';
import { redis } from '../config/redis.js';

const TOKEN_PREFIX = 'sse-token:';
const TOKEN_TTL_SECONDS = 60;
const TOKEN_BYTES = 32;

export async function generateSSEToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const key = `${TOKEN_PREFIX}${token}`;
  await redis.set(key, userId, 'EX', TOKEN_TTL_SECONDS);
  return token;
}

/**
 * Validates and consumes an SSE token (single-use).
 * Returns the userId if valid, null otherwise.
 */
export async function consumeSSEToken(token: string): Promise<string | null> {
  const key = `${TOKEN_PREFIX}${token}`;

  // Atomic GET + DEL via pipeline
  const pipeline = redis.pipeline();
  pipeline.get(key);
  pipeline.del(key);
  const results = await pipeline.exec();

  if (!results) return null;

  const [err, userId] = results[0] as [Error | null, string | null];
  if (err || !userId) return null;

  return userId;
}
