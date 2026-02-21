import { clerkMiddleware, getAuth, clerkClient } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { findByClerkId, createFromClerk } from '../services/users.service.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Global Clerk middleware — mount on the Express app.
 * Makes auth information available on all requests via getAuth(req).
 */
export const clerkAuth = clerkMiddleware();

/**
 * Require authentication and attach the full user record to req.user.
 * Use on protected routes after clerkAuth has run globally.
 * Auto-creates the DB user on first request if the webhook hasn't fired yet.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    let user = await findByClerkId(auth.userId);

    if (!user) {
      // Auto-create user from Clerk (covers local dev without webhook)
      try {
        const clerkUser = await clerkClient.users.getUser(auth.userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
        const fullName =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined;

        user = await createFromClerk({ clerkId: auth.userId, email, fullName });
        console.log(`[auth] Auto-created user: ${auth.userId} (${email})`);
      } catch {
        throw new UnauthorizedError('User not found in database');
      }
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
