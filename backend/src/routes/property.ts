/**
 * Property Routes
 * API endpoints for property management
 */

import { Router } from 'express';
import {
  createProperty,
  getPropertiesByLandlordWallet,
  generateDepositQR,
  getPropertyDetails,
} from '../controllers/property.controller.js';
import {
  getMarketplace,
  getPublicPropertyDetails,
} from '../controllers/marketplace.controller.js';
import {
  updateProperty,
  deleteProperty,
  togglePropertyListing,
} from '../controllers/property-management.controller.js';

const router = Router();

// Marketplace routes (must come before parameterized routes)
// GET /api/properties/marketplace
router.get('/marketplace', getMarketplace);

// GET /api/properties/:id/public
router.get('/:id/public', getPublicPropertyDetails);

// Property management routes
// PUT /api/properties/:id/update
router.put('/:id/update', updateProperty);

// DELETE /api/properties/:id/delete
router.delete('/:id/delete', deleteProperty);

// PUT /api/properties/:id/toggle-listing
router.put('/:id/toggle-listing', togglePropertyListing);

// Landlord routes
// POST /api/properties/create
router.post('/create', createProperty);

// GET /api/properties/:landlordWallet
router.get('/:landlordWallet', getPropertiesByLandlordWallet);

// POST /api/properties/:propertyId/generate-qr
router.post('/:propertyId/generate-qr', generateDepositQR);

// GET /api/properties/:propertyId/details
router.get('/:propertyId/details', getPropertyDetails);

export { router as propertyRoutes };
