import { Request, Response } from 'express';
import {
  getMarketplaceProperties,
  getPropertyById,
  getDatabase,
} from '../database/db.js';
import { getEscrowWalletForProperty } from '../services/escrow.service.js';

/**
 * GET /api/properties/marketplace
 * Get all available properties for public marketplace
 */
export async function getMarketplace(req: Request, res: Response) {
  try {
    console.log('📋 Fetching marketplace properties');

    const properties = await getMarketplaceProperties();

    // Fetch escrow details for each property
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const escrow = await getEscrowWalletForProperty(property.id);
        
        // Get active lease count
        const db = await getDatabase();
        const leaseCount = await db.get(
          'SELECT COUNT(*) as count FROM leases WHERE property_id = ? AND status = "active"',
          [property.id]
        );

        return {
          id: property.id,
          property_name: property.property_name,
          deposit_amount: property.deposit_amount,
          lease_duration_months: property.lease_duration_months,
          location: property.location,
          description: property.description,
          landlord_wallet: property.landlord_wallet.slice(0, 8) + '...' + property.landlord_wallet.slice(-8), // Truncated for privacy
          landlord_wallet_full: property.landlord_wallet, // Full address for QR/payment
          escrow_address: escrow?.public_key || null,
          availability_status: property.availability_status,
          active_leases: leaseCount?.count || 0,
          created_at: property.created_at,
        };
      })
    );

    res.json({
      success: true,
      count: propertiesWithDetails.length,
      properties: propertiesWithDetails,
    });
  } catch (error: any) {
    console.error('❌ Error fetching marketplace:', error);
    res.status(500).json({
      error: 'Failed to fetch marketplace properties',
      message: error.message,
    });
  }
}

/**
 * GET /api/properties/:id/public
 * Get public property details (tenant-facing)
 */
export async function getPublicPropertyDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;

    console.log(`📄 Fetching public property details: ${id}`);

    // Get property
    const property = await getPropertyById(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Get escrow wallet
    const escrow = await getEscrowWalletForProperty(id);

    // Get active leases count (but not details for privacy)
    const db = await getDatabase();
    const leaseStats = await db.get(
      `SELECT 
        COUNT(*) as total_leases,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_leases
       FROM leases 
       WHERE property_id = ?`,
      [id]
    );

    res.json({
      success: true,
      property: {
        id: property.id,
        property_name: property.property_name,
        deposit_amount: property.deposit_amount,
        lease_duration_months: property.lease_duration_months,
        location: property.location,
        description: property.description,
        landlord_wallet: property.landlord_wallet,
        escrow_address: escrow?.public_key || null,
        availability_status: property.availability_status,
        release_conditions: property.release_conditions
          ? JSON.parse(property.release_conditions)
          : null,
        created_at: property.created_at,
      },
      stats: {
        total_leases: leaseStats?.total_leases || 0,
        active_leases: leaseStats?.active_leases || 0,
        is_available: property.availability_status === 'available',
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching public property details:', error);
    res.status(500).json({
      error: 'Failed to fetch property details',
      message: error.message,
    });
  }
}
