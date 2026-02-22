import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { enrichmentConfigs } from '../db/schema.js';
import { encrypt } from '../utils/encryption.js';
import { NotFoundError } from '../utils/errors.js';

// ── Types ──────────────────────────────────────

export interface EnrichmentConfigPublic {
  id: string;
  provider: string;
  isValid: boolean;
  lastValidatedAt: Date | null;
  createdAt: Date;
}

// ── Validation ─────────────────────────────────

export async function validateClayApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.clay.com/v1/sources', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ── CRUD ───────────────────────────────────────

export async function saveConfig(
  userId: string,
  provider: string,
  apiKey: string,
  isValid: boolean,
): Promise<EnrichmentConfigPublic> {
  const encryptedKey = encrypt(apiKey);
  const now = new Date();

  // Check if config already exists for this user + provider
  const [existing] = await db
    .select()
    .from(enrichmentConfigs)
    .where(
      and(
        eq(enrichmentConfigs.userId, userId),
        eq(enrichmentConfigs.provider, provider),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(enrichmentConfigs)
      .set({
        apiKey: encryptedKey,
        isValid,
        lastValidatedAt: now,
      })
      .where(eq(enrichmentConfigs.id, existing.id))
      .returning();
    return sanitizeConfig(updated);
  }

  const [created] = await db
    .insert(enrichmentConfigs)
    .values({
      userId,
      provider,
      apiKey: encryptedKey,
      isValid,
      lastValidatedAt: now,
    })
    .returning();
  return sanitizeConfig(created);
}

export async function getConfigsByUser(userId: string): Promise<EnrichmentConfigPublic[]> {
  const configs = await db
    .select()
    .from(enrichmentConfigs)
    .where(eq(enrichmentConfigs.userId, userId));
  return configs.map(sanitizeConfig);
}

// ── Mock ──────────────────────────────────────

export async function createMockConfig(userId: string): Promise<EnrichmentConfigPublic> {
  const [existing] = await db
    .select()
    .from(enrichmentConfigs)
    .where(
      and(
        eq(enrichmentConfigs.userId, userId),
        eq(enrichmentConfigs.provider, 'clay'),
      ),
    )
    .limit(1);

  if (existing) {
    return sanitizeConfig(existing);
  }

  const [created] = await db
    .insert(enrichmentConfigs)
    .values({
      userId,
      provider: 'clay',
      apiKey: 'mock_demo_clay_key',
      isValid: true,
      lastValidatedAt: new Date(),
    })
    .returning();
  return sanitizeConfig(created);
}

// ── Helpers ────────────────────────────────────

function sanitizeConfig(
  config: typeof enrichmentConfigs.$inferSelect,
): EnrichmentConfigPublic {
  return {
    id: config.id,
    provider: config.provider,
    isValid: config.isValid,
    lastValidatedAt: config.lastValidatedAt,
    createdAt: config.createdAt,
  };
}
