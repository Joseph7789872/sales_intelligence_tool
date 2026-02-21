import { eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { users } from '../db/schema.js';
import { NotFoundError } from '../utils/errors.js';
import type { User } from '../types/express.js';

export async function findByClerkId(clerkId: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user;
}

export async function createFromClerk(data: {
  clerkId: string;
  email: string;
  fullName?: string;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      clerkId: data.clerkId,
      email: data.email,
      fullName: data.fullName,
      onboardingStep: 0,
    })
    .returning();
  return user;
}

export async function updateFromClerk(
  clerkId: string,
  data: { email?: string; fullName?: string },
): Promise<User> {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId))
    .returning();

  if (!user) {
    throw new NotFoundError('User');
  }
  return user;
}

export async function deleteByClerkId(clerkId: string): Promise<void> {
  await db.delete(users).where(eq(users.clerkId, clerkId));
}

export async function updateProfile(
  userId: string,
  data: { companyName?: string; fullName?: string },
): Promise<User> {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!user) {
    throw new NotFoundError('User');
  }
  return user;
}
