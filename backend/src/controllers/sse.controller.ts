import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { generateSSEToken, consumeSSEToken } from '../services/sse-token.service.js';
import { addConnection, removeConnection } from '../services/sse-connection-manager.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

/**
 * POST /api/v1/sse/token
 * Generates a short-lived SSE auth token for the authenticated user.
 */
export async function createSSEToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = await generateSSEToken(req.user!.id);
    res.json({ data: { token } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/sse/stream?token=xxx
 * Establishes an SSE connection after validating the short-lived token.
 * Mounted before Clerk middleware — uses token-based auth.
 */
export async function sseStream(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      throw new ValidationError('SSE token is required');
    }

    const userId = await consumeSSEToken(token);
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired SSE token');
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': env.FRONTEND_URL,
      'Access-Control-Allow-Credentials': 'true',
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

    // Register connection
    addConnection(userId, res);

    // Clean up on disconnect
    req.on('close', () => {
      removeConnection(userId, res);
    });
  } catch (error) {
    next(error);
  }
}
