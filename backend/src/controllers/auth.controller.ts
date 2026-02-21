import type { Request, Response, NextFunction } from 'express';
import { Webhook } from 'svix';
import { env } from '../config/env.js';
import * as usersService from '../services/users.service.js';
import { ValidationError } from '../utils/errors.js';

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
  };
}

export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!env.CLERK_WEBHOOK_SECRET) {
      throw new ValidationError('Webhook secret not configured');
    }

    const svixId = req.headers['svix-id'] as string | undefined;
    const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
    const svixSignature = req.headers['svix-signature'] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new ValidationError('Missing webhook signature headers');
    }

    // req.body is a raw Buffer here (express.raw middleware applied to this route)
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(req.body as unknown as string, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;

    const { type, data } = evt;
    const clerkId = data.id;
    const email = data.email_addresses[0]?.email_address ?? '';
    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined;

    switch (type) {
      case 'user.created':
        await usersService.createFromClerk({ clerkId, email, fullName });
        console.log(`[webhook] user.created: ${clerkId} (${email})`);
        break;

      case 'user.updated':
        await usersService.updateFromClerk(clerkId, { email, fullName });
        console.log(`[webhook] user.updated: ${clerkId}`);
        break;

      case 'user.deleted':
        await usersService.deleteByClerkId(clerkId);
        console.log(`[webhook] user.deleted: ${clerkId}`);
        break;

      default:
        console.log(`[webhook] unhandled event: ${type}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
