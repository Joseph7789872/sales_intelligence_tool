import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  salesforceAuthorize,
  salesforceCallback,
  listConnections,
  disconnectConnection,
} from '../controllers/crm.controller.js';

const router = Router();

// All CRM routes require authentication
router.use(requireAuth);

// Salesforce OAuth
router.get('/salesforce/authorize', salesforceAuthorize);
router.get('/salesforce/callback', salesforceCallback);

// Generic CRM connection management
router.get('/connections', listConnections);
router.delete('/connections/:id', disconnectConnection);

export default router;
