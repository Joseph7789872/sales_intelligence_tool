import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import {
  startAnalysis,
  listAnalyses,
  getAnalysis,
} from '../controllers/analysis.controller.js';

const router = Router();

router.use(requireAuth);

// ── Schemas ────────────────────────────────────

const startAnalysisSchema = z.object({
  selectedDealIds: z
    .array(z.string().uuid())
    .min(10, 'At least 10 deals are required'),
});

const analysisIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ── Routes ─────────────────────────────────────

router.post('/', validate(startAnalysisSchema), startAnalysis);
router.get('/', listAnalyses);
router.get('/:id', validateParams(analysisIdParamSchema), getAnalysis);

export default router;
