import type { users } from '../db/schema.js';

export type User = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
