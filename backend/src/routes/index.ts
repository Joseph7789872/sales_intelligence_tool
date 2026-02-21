import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import crmRoutes from './crm.routes.js';
import dealsRoutes from './deals.routes.js';
import sseRoutes from './sse.routes.js';
import enrichmentRoutes from './enrichment.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/crm', crmRoutes);
router.use('/deals', dealsRoutes);
router.use('/sse', sseRoutes);
router.use('/enrichment', enrichmentRoutes);

export default router;
