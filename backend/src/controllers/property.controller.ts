/**
 * Property Controller
 * Handles property management, escrow creation, and QR generation
 */

import { Request, Response } from 'express';
import {
  createPropertyRecord,
  getPropertyById,
  getPropertiesByLandlord,
  updatePropertyEscrowWallet,
  getDatabase,
  getMarketplaceProperties,
  updatePropertyAvailability,
} from '../database/db.js';
import {
  createEscrowWallet,
  fundEscrowWallet,
  addDepositTrustline,
  getEscrowWalletForProperty,
} from '../services/escrow.service.js';

const ISSUER_PUBLIC_KEY = process.env.DEPOSIT_ISSUER_PUBLIC_KEY!;
const ASSET_CODE = process.env.DEPOSIT_ASSET_CODE || 'DEPOSIT_INR';

/**
 * POST /api/properties/create
 * Create a new property with escrow wallet
 */
export async function createProperty(req: Request, res: Response) {
  try {
    const { landlord_wallet, property_name, deposit_amount, lease_duration } = req.body;

    // Validation
    if (!landlord_wallet || !property_name || !deposit_amount || !lease_duration) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['landlord_wallet', 'property_name', 'deposit_amount', 'lease_duration'],
      });
    }

    if (deposit_amount <= 0) {
      return res.status(400).json({ error: 'Deposit amount must be positive' });
    }

    if (lease_duration <= 0) {
      return res.status(400).json({ error: 'Lease duration must be positive' });
    }

    // Validate Stellar address format
    if (!landlord_wallet.startsWith('G') || landlord_wallet.length !== 56) {
      return res.status(400).json({ error: 'Invalid Stellar address format' });
    }

    console.log(`📝 Creating property: ${property_name} for ${landlord_wallet}`);

    // 1. Create property record
    const property = await createPropertyRecord(
      landlord_wallet,
      property_name,
      deposit_amount,
      lease_duration,
      req.body.release_conditions ? JSON.stringify(req.body.release_conditions) : undefined
    );

    // 2. Create escrow wallet
    const { escrowWallet, publicKey: escrowAddress } = await createEscrowWallet(property.id);

    // 3. Link escrow to property
    await updatePropertyEscrowWallet(property.id, escrowWallet.id);

    // 4. Fund escrow wallet (async - don't wait)
    fundEscrowWallet(escrowWallet.id)
      .then(() => addDepositTrustline(escrowWallet.id))
      .then(() => console.log(`✅ Escrow wallet funded and trustline added: ${escrowAddress}`))
      .catch(err => console.error(`⚠️  Escrow setup warning:`, err.message));

    console.log(`✅ Property created: ${property.id}`);

    res.status(201).json({
      success: true,
      property: {
        id: property.id,
        landlord_wallet: property.landlord_wallet,
        property_name: property.property_name,
        deposit_amount: property.deposit_amount,
        lease_duration_months: property.lease_duration_months,
        escrow_address: escrowAddress,
        created_at: property.created_at,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creating property:', error);
    res.status(500).json({
      error: 'Failed to create property',
      message: error.message,
    });
  }
}

/**
 * GET /api/properties/:landlordWallet
 * List all properties for a landlord
 */
export async function getPropertiesByLandlordWallet(req: Request, res: Response) {
  try {
    const { landlordWallet } = req.params;

    // Validate Stellar address
    if (!landlordWallet.startsWith('G') || landlordWallet.length !== 56) {
      return res.status(400).json({ error: 'Invalid Stellar address format' });
    }

    console.log(`📋 Fetching properties for landlord: ${landlordWallet}`);

    const properties = await getPropertiesByLandlord(landlordWallet);

    // Fetch escrow details for each property
    const propertiesWithEscrow = await Promise.all(
      properties.map(async (property) => {
        const escrow = await getEscrowWalletForProperty(property.id);
        return {
          id: property.id,
          landlord_wallet: property.landlord_wallet,
          property_name: property.property_name,
          deposit_amount: property.deposit_amount,
          lease_duration_months: property.lease_duration_months,
          release_conditions: property.release_conditions
            ? JSON.parse(property.release_conditions)
            : null,
          escrow_address: escrow?.public_key || null,
          escrow_status: escrow?.status || null,
          created_at: property.created_at,
          updated_at: property.updated_at,
        };
      })
    );

    res.json({
      success: true,
      count: propertiesWithEscrow.length,
      properties: propertiesWithEscrow,
    });
  } catch (error: any) {
    console.error('❌ Error fetching properties:', error);
    res.status(500).json({
      error: 'Failed to fetch properties',
      message: error.message,
    });
  }
}

/**
 * POST /api/properties/:propertyId/generate-qr
 * Generate deposit QR code payload
 */
export async function generateDepositQR(req: Request, res: Response) {
  try {
    const { propertyId } = req.params;

    console.log(`🔲 Generating QR for property: ${propertyId}`);

    // Get property details
    const property = await getPropertyById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Get escrow wallet
    const escrow = await getEscrowWalletForProperty(propertyId);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow wallet not found for this property' });
    }

    // Generate QR payload
    const qrPayload = `stellar:${escrow.public_key}?asset=${ASSET_CODE}&amount=${property.deposit_amount}&lease=${property.lease_duration_months}&property=${propertyId}&issuer=${ISSUER_PUBLIC_KEY}`;

    console.log(`✅ QR generated for property: ${property.property_name}`);

    res.json({
      success: true,
      qr_payload: qrPayload,
      metadata: {
        property_id: property.id,
        property_name: property.property_name,
        escrow_address: escrow.public_key,
        deposit_amount: property.deposit_amount,
        lease_duration_months: property.lease_duration_months,
        asset_code: ASSET_CODE,
        issuer: ISSUER_PUBLIC_KEY,
      },
    });
  } catch (error: any) {
    console.error('❌ Error generating QR:', error);
    res.status(500).json({
      error: 'Failed to generate QR code',
      message: error.message,
    });
  }
}

/**
 * GET /api/properties/:propertyId/details
 * Get property details with active leases
 */
export async function getPropertyDetails(req: Request, res: Response) {
  try {
    const { propertyId } = req.params;

    console.log(`📄 Fetching property details: ${propertyId}`);

    // Get property
    const property = await getPropertyById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Get escrow wallet
    const escrow = await getEscrowWalletForProperty(propertyId);

    // Get active leases
    const db = await getDatabase();
    const leases = await db.all(
      `SELECT 
        id, 
        tenant_wallet, 
        deposit_amount, 
        deposit_tx_hash,
        lease_start_date, 
        lease_end_date, 
        status,
        created_at
       FROM leases 
       WHERE property_id = ? 
       ORDER BY created_at DESC`,
      [propertyId]
    );

    res.json({
      success: true,
      property: {
        id: property.id,
        landlord_wallet: property.landlord_wallet,
        property_name: property.property_name,
        deposit_amount: property.deposit_amount,
        lease_duration_months: property.lease_duration_months,
        escrow_address: escrow?.public_key || null,
        release_conditions: property.release_conditions
          ? JSON.parse(property.release_conditions)
          : null,
        created_at: property.created_at,
        updated_at: property.updated_at,
      },
      leases: leases,
      stats: {
        total_leases: leases.length,
        active_leases: leases.filter((l: any) => l.status === 'active').length,
        pending_leases: leases.filter((l: any) => l.status === 'pending').length,
        completed_leases: leases.filter((l: any) => l.status === 'completed').length,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching property details:', error);
    res.status(500).json({
      error: 'Failed to fetch property details',
      message: error.message,
    });
  }
}
