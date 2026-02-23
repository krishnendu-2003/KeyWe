/**
 * Release Routes
 * API endpoints for deposit release workflow
 */

import { Router } from 'express';
import {
  approveRelease,
  executeRelease,
  getTimeline,
  autoTrigger,
} from '../controllers/release.controller.js';

const router = Router();

// POST /api/release/approve
router.post('/approve', approveRelease);

// POST /api/release/execute
router.post('/execute', executeRelease);

// GET /api/release/timeline/:leaseId
router.get('/timeline/:leaseId', getTimeline);

// POST /api/release/auto-trigger
router.post('/auto-trigger', autoTrigger);

export { router as releaseRoutes };
