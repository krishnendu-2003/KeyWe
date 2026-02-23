/**
 * Deposit Routes
 * API endpoints for deposit transaction handling
 */

import { Router } from 'express';
import {
  validateQR,
  buildTransaction,
  submitDeposit,
  getDepositStatus,
} from '../controllers/deposit.controller.js';

const router = Router();

// POST /api/deposits/validate-qr
router.post('/validate-qr', validateQR);

// POST /api/deposits/build-transaction
router.post('/build-transaction', buildTransaction);

// POST /api/deposits/submit
router.post('/submit', submitDeposit);

// GET /api/deposits/status/:leaseId
router.get('/status/:leaseId', getDepositStatus);

export { router as depositRoutes };
