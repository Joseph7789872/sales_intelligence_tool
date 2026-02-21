import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  triggerSync,
  getSyncStatus,
  listDeals,
} from '../controllers/deals.controller.js';

const router = Router();

router.use(requireAuth);

// ── Schemas ────────────────────────────────────

const triggerSyncSchema = z.object({
  connectionId: z.string().uuid(),
});

const listDealsQuerySchema = z.object({
  connectionId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['closeDate', 'amount', 'companyName']).default('closeDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Routes ─────────────────────────────────────

router.post('/sync', validate(triggerSyncSchema), triggerSync);
router.get('/sync/:jobId', getSyncStatus);
router.get('/', validateQuery(listDealsQuerySchema), listDeals);

export default router;
