/**
 * Update and Delete Property Functions
 */

import { Request, Response } from 'express';
import {
  getPropertyById,
  getDatabase,
  updatePropertyAvailability,
} from '../database/db.js';

/**
 * PUT /api/properties/:id/update
 * Update property details
 */
export async function updateProperty(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { property_name, deposit_amount, lease_duration, location, description, availability_status } = req.body;

    console.log(`📝 Updating property: ${id}`);

    // Get existing property
    const property = await getPropertyById(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Update property
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.run(
      `UPDATE properties 
       SET property_name = ?, 
           deposit_amount = ?, 
           lease_duration_months = ?,
           location = ?,
           description = ?,
           availability_status = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        property_name || property.property_name,
        deposit_amount || property.deposit_amount,
        lease_duration || property.lease_duration_months,
        location !== undefined ? location : property.location,
        description !== undefined ? description : property.description,
        availability_status || property.availability_status,
        now,
        id,
      ]
    );

    // Get updated property
    const updatedProperty = await getPropertyById(id);

    res.json({
      success: true,
      message: 'Property updated successfully',
      property: updatedProperty,
    });
  } catch (error: any) {
    console.error('❌ Error updating property:', error);
    res.status(500).json({
      error: 'Failed to update property',
      message: error.message,
    });
  }
}

/**
 * DELETE /api/properties/:id/delete
 * Delete property (only if no active leases)
 */
export async function deleteProperty(req: Request, res: Response) {
  try {
    const { id } = req.params;

    console.log(`🗑️  Deleting property: ${id}`);

    // Get property
    const property = await getPropertyById(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check for active leases
    const db = await getDatabase();
    const activeLeases = await db.get(
      'SELECT COUNT(*) as count FROM leases WHERE property_id = ? AND status = "active"',
      [id]
    );

    if (activeLeases && activeLeases.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete property with active leases',
        active_leases: activeLeases.count,
      });
    }

    // Delete related records first
    await db.run('DELETE FROM leases WHERE property_id = ?', [id]);
    await db.run('DELETE FROM escrow_wallets WHERE property_id = ?', [id]);
    
    // Delete property
    await db.run('DELETE FROM properties WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting property:', error);
    res.status(500).json({
      error: 'Failed to delete property',
      message: error.message,
    });
  }
}

/**
 * PUT /api/properties/:id/toggle-listing
 * Toggle property listing status (available/unlisted)
 */
export async function togglePropertyListing(req: Request, res: Response) {
  try {
    const { id } = req.params;

    console.log(`🔄 Toggling property listing: ${id}`);

    const property = await getPropertyById(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Toggle between available and unlisted
    const newStatus = property.availability_status === 'available' ? 'unlisted' : 'available';
    
    await updatePropertyAvailability(id, newStatus);

    res.json({
      success: true,
      message: `Property ${newStatus === 'available' ? 'listed' : 'unlisted'} successfully`,
      availability_status: newStatus,
    });
  } catch (error: any) {
    console.error('❌ Error toggling listing:', error);
    res.status(500).json({
      error: 'Failed to toggle listing',
      message: error.message,
    });
  }
}
