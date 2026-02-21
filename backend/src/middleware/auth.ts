import { clerkMiddleware, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { findByClerkId } from '../services/users.service.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Global Clerk middleware — mount on the Express app.
 * Makes auth information available on all requests via getAuth(req).
 */
export const clerkAuth = clerkMiddleware();

/**
 * Require authentication and attach the full user record to req.user.
 * Use on protected routes after clerkAuth has run globally.
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

    const user = await findByClerkId(auth.userId);

    if (!user) {
      throw new UnauthorizedError('User not found in database');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
