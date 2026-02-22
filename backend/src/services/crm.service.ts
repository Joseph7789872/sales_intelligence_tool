import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { crmConnections } from '../db/schema.js';
import { env } from '../config/env.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { NotFoundError, AppError } from '../utils/errors.js';

// ── Types ──────────────────────────────────────

interface SalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  issued_at: string;
  token_type: string;
  id: string;
}

export interface CrmConnectionPublic {
  id: string;
  provider: string;
  instanceUrl: string | null;
  status: string;
  lastSyncAt: Date | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Salesforce OAuth ───────────────────────────

const SF_AUTH_BASE = 'https://login.salesforce.com';
const SF_TOKEN_EXPIRY_MS = 90 * 60 * 1000; // 1.5 hours (conservative)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minute buffer

export function buildSalesforceAuthorizeUrl(state: string): string {
  if (!env.SALESFORCE_CLIENT_ID || !env.SALESFORCE_CLIENT_SECRET || !env.SALESFORCE_REDIRECT_URI) {
    throw new AppError('Salesforce OAuth is not configured', 500, 'SALESFORCE_NOT_CONFIGURED');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.SALESFORCE_CLIENT_ID,
    redirect_uri: env.SALESFORCE_REDIRECT_URI,
    scope: 'api refresh_token offline_access',
    state,
    prompt: 'consent',
  });
  return `${SF_AUTH_BASE}/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeSalesforceCode(code: string): Promise<SalesforceTokenResponse> {
  const response = await fetch(`${SF_AUTH_BASE}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.SALESFORCE_CLIENT_ID!,
      client_secret: env.SALESFORCE_CLIENT_SECRET!,
      redirect_uri: env.SALESFORCE_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AppError(
      `Salesforce token exchange failed: ${errorBody}`,
      502,
      'SALESFORCE_TOKEN_ERROR',
    );
  }

  return response.json() as Promise<SalesforceTokenResponse>;
}

export async function refreshSalesforceToken(connectionId: string): Promise<void> {
  const [connection] = await db
    .select()
    .from(crmConnections)
    .where(eq(crmConnections.id, connectionId))
    .limit(1);

  if (!connection) throw new NotFoundError('CRM Connection');

  const currentRefreshToken = decrypt(connection.refreshToken);

  const response = await fetch(`${SF_AUTH_BASE}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: currentRefreshToken,
      client_id: env.SALESFORCE_CLIENT_ID!,
      client_secret: env.SALESFORCE_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    await db
      .update(crmConnections)
      .set({ status: 'error', updatedAt: new Date() })
      .where(eq(crmConnections.id, connectionId));
    throw new AppError('Salesforce token refresh failed', 502, 'SALESFORCE_REFRESH_ERROR');
  }

  const data = (await response.json()) as { access_token: string; issued_at: string };

  await db
    .update(crmConnections)
    .set({
      accessToken: encrypt(data.access_token),
      tokenExpiresAt: new Date(Date.now() + SF_TOKEN_EXPIRY_MS),
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(crmConnections.id, connectionId));
}

// ── Generic CRM Connection CRUD ────────────────

export async function upsertConnection(
  userId: string,
  provider: string,
  tokens: SalesforceTokenResponse,
): Promise<CrmConnectionPublic> {
  const expiresAt = new Date(Date.now() + SF_TOKEN_EXPIRY_MS);

  const [existing] = await db
    .select()
    .from(crmConnections)
    .where(
      and(eq(crmConnections.userId, userId), eq(crmConnections.provider, provider)),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(crmConnections)
      .set({
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        instanceUrl: tokens.instance_url,
        tokenExpiresAt: expiresAt,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(crmConnections.id, existing.id))
      .returning();
    return sanitizeConnection(updated);
  }

  const [created] = await db
    .insert(crmConnections)
    .values({
      userId,
      provider,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      instanceUrl: tokens.instance_url,
      tokenExpiresAt: expiresAt,
      status: 'active',
    })
    .returning();
  return sanitizeConnection(created);
}

export async function listConnectionsByUser(userId: string): Promise<CrmConnectionPublic[]> {
  const connections = await db
    .select()
    .from(crmConnections)
    .where(eq(crmConnections.userId, userId));
  return connections.map(sanitizeConnection);
}

export async function disconnectConnection(userId: string, connectionId: string): Promise<void> {
  const [connection] = await db
    .select()
    .from(crmConnections)
    .where(
      and(eq(crmConnections.id, connectionId), eq(crmConnections.userId, userId)),
    )
    .limit(1);

  if (!connection) throw new NotFoundError('CRM Connection');

  await db.delete(crmConnections).where(eq(crmConnections.id, connectionId));
}

/**
 * Get a valid (decrypted) access token for a connection.
 * Auto-refreshes if expired. Used by deal sync jobs and other downstream services.
 */
export async function getValidAccessToken(connectionId: string): Promise<{
  accessToken: string;
  instanceUrl: string;
}> {
  const [connection] = await db
    .select()
    .from(crmConnections)
    .where(eq(crmConnections.id, connectionId))
    .limit(1);

  if (!connection) throw new NotFoundError('CRM Connection');

  const isExpired =
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() < Date.now() + TOKEN_REFRESH_BUFFER_MS;

  if (isExpired) {
    await refreshSalesforceToken(connectionId);
    const [refreshed] = await db
      .select()
      .from(crmConnections)
      .where(eq(crmConnections.id, connectionId))
      .limit(1);
    return {
      accessToken: decrypt(refreshed.accessToken),
      instanceUrl: refreshed.instanceUrl!,
    };
  }

  return {
    accessToken: decrypt(connection.accessToken),
    instanceUrl: connection.instanceUrl!,
  };
}

// ── Mock Connection ────────────────────────────

export async function createMockConnection(userId: string): Promise<CrmConnectionPublic> {
  const [existing] = await db
    .select()
    .from(crmConnections)
    .where(
      and(eq(crmConnections.userId, userId), eq(crmConnections.provider, 'salesforce')),
    )
    .limit(1);

  if (existing) {
    return sanitizeConnection(existing);
  }

  const [created] = await db
    .insert(crmConnections)
    .values({
      userId,
      provider: 'salesforce',
      accessToken: 'mock_demo_access_token',
      refreshToken: 'mock_demo_refresh_token',
      instanceUrl: 'https://demo.salesforce.com',
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    })
    .returning();

  return sanitizeConnection(created);
}

// ── Helpers ────────────────────────────────────

function sanitizeConnection(
  conn: typeof crmConnections.$inferSelect,
): CrmConnectionPublic {
  return {
    id: conn.id,
    provider: conn.provider,
    instanceUrl: conn.instanceUrl,
    status: conn.status,
    lastSyncAt: conn.lastSyncAt,
    tokenExpiresAt: conn.tokenExpiresAt,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
}
