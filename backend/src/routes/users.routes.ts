import { Router } from 'express';
import { z } from 'zod';
import {
  getCurrentUser,
  updateCurrentUser,
  updateOnboardingStep,
} from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

// GET /api/v1/users/me
router.get('/me', getCurrentUser);

// PATCH /api/v1/users/me
const updateProfileSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  fullName: z.string().min(1).max(255).optional(),
});

router.patch('/me', validate(updateProfileSchema), updateCurrentUser);

// PATCH /api/v1/users/me/onboarding-step
const updateOnboardingStepSchema = z.object({
  step: z.number().int().min(0).max(4),
});

router.patch(
  '/me/onboarding-step',
  validate(updateOnboardingStepSchema),
  updateOnboardingStep,
);

export default router;
