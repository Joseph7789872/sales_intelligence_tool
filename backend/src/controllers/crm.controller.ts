import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import * as crmService from '../services/crm.service.js';

const STATE_PREFIX = 'oauth_state:';
const STATE_TTL_SECONDS = 600; // 10 minutes

/**
 * GET /api/v1/crm/salesforce/authorize
 * Generates CSRF state, stores in Redis, redirects to Salesforce.
 */
export async function salesforceAuthorize(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stateToken = crypto.randomBytes(32).toString('hex');
    const stateKey = `${STATE_PREFIX}${stateToken}`;
    const context = (req.query.context as string) || 'settings';
    await redis.set(
      stateKey,
      JSON.stringify({ userId: req.user!.id, context }),
      'EX',
      STATE_TTL_SECONDS,
    );

    const authorizeUrl = crmService.buildSalesforceAuthorizeUrl(stateToken);
    res.redirect(authorizeUrl);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/crm/salesforce/callback
 * Exchanges code for tokens, stores encrypted in DB, redirects to frontend.
 */
export async function salesforceCallback(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { code, state, error: sfError, error_description } = req.query;

    // Salesforce may redirect back with an error
    if (sfError) {
      const errorMsg = encodeURIComponent(
        (error_description as string) || 'Salesforce authorization denied',
      );
      res.redirect(`${env.FRONTEND_URL}/settings/integrations?error=${errorMsg}`);
      return;
    }

    if (!code || !state) {
      res.redirect(
        `${env.FRONTEND_URL}/settings/integrations?error=Missing+authorization+code+or+state`,
      );
      return;
    }

    // Validate CSRF state token
    const stateKey = `${STATE_PREFIX}${state as string}`;
    const storedValue = await redis.get(stateKey);

    if (!storedValue) {
      res.redirect(
        `${env.FRONTEND_URL}/settings/integrations?error=Invalid+or+expired+state+parameter`,
      );
      return;
    }

    // Delete state immediately (single-use)
    await redis.del(stateKey);

    // Parse stored state (supports both legacy string and new JSON format)
    let storedUserId: string;
    let context = 'settings';
    try {
      const parsed = JSON.parse(storedValue) as { userId: string; context: string };
      storedUserId = parsed.userId;
      context = parsed.context;
    } catch {
      storedUserId = storedValue;
    }

    // Verify the state belongs to the authenticated user
    if (storedUserId !== req.user!.id) {
      res.redirect(`${env.FRONTEND_URL}/settings/integrations?error=State+mismatch`);
      return;
    }

    // Exchange code for tokens
    const tokens = await crmService.exchangeSalesforceCode(code as string);

    // Store encrypted tokens in DB
    await crmService.upsertConnection(req.user!.id, 'salesforce', tokens);

    // Redirect to frontend based on context
    const redirectPath = context === 'onboarding'
      ? '/onboarding?connected=salesforce'
      : '/settings/integrations?connected=salesforce';
    res.redirect(`${env.FRONTEND_URL}${redirectPath}`);
  } catch (error) {
    console.error('Salesforce callback error:', error);
    res.redirect(
      `${env.FRONTEND_URL}/settings/integrations?error=Failed+to+connect+Salesforce`,
    );
  }
}

/**
 * GET /api/v1/crm/connections
 */
export async function listConnections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const connections = await crmService.listConnectionsByUser(req.user!.id);
    res.json({ data: connections });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/crm/connections/:id
 */
export async function disconnectConnection(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await crmService.disconnectConnection(req.user!.id, req.params.id);
    res.json({ message: 'CRM connection removed successfully' });
  } catch (error) {
    next(error);
  }
}
