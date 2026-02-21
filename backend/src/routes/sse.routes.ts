import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createSSEToken } from '../controllers/sse.controller.js';

const router = Router();

// Token endpoint — normal Clerk auth
// (Stream endpoint is mounted directly in index.ts before Clerk middleware)
router.post('/token', requireAuth, createSSEToken);

export default router;
