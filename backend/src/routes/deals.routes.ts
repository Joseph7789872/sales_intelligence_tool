import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import {
  triggerSync,
  mockDealSync,
  getSyncStatus,
  listDeals,
  getDealDetail,
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

const dealIdParamSchema = z.object({
  dealId: z.string().uuid(),
});

// ── Routes ─────────────────────────────────────

router.post('/sync', validate(triggerSyncSchema), triggerSync);
router.post('/mock-sync', validate(triggerSyncSchema), mockDealSync);
router.get('/sync/:jobId', getSyncStatus);
router.get('/', validateQuery(listDealsQuerySchema), listDeals);
router.get('/:dealId', validateParams(dealIdParamSchema), getDealDetail);

export default router;
