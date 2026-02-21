import { Router } from 'express';
import { handleWebhook } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/v1/auth/webhook — Clerk webhook handler
// No auth middleware — called by Clerk servers
router.post('/webhook', handleWebhook);

export default router;
