import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  saveEnrichmentConfig,
  mockEnrichmentConfig,
  listEnrichmentConfigs,
} from '../controllers/enrichment.controller.js';

const router = Router();

router.use(requireAuth);

// POST /api/v1/enrichment/configs
const saveConfigSchema = z.object({
  provider: z.enum(['clay', 'zoominfo', 'apollo', 'fullenrich', 'clearbit']),
  apiKey: z.string().min(1),
});

router.post('/configs', validate(saveConfigSchema), saveEnrichmentConfig);

// POST /api/v1/enrichment/mock-config
router.post('/mock-config', mockEnrichmentConfig);

// GET /api/v1/enrichment/configs
router.get('/configs', listEnrichmentConfigs);

export default router;
