-- Migration: Add Property Marketplace Support
-- Date: 2026-01-26
-- Description: Adds availability_status, location, and description to properties table

-- Add new columns to properties table
ALTER TABLE properties ADD COLUMN availability_status TEXT DEFAULT 'available';
ALTER TABLE properties ADD COLUMN location TEXT;
ALTER TABLE properties ADD COLUMN description TEXT;

-- Create index for faster marketplace queries
CREATE INDEX idx_properties_availability ON properties(availability_status);

-- Set existing properties with active leases to 'occupied'
UPDATE properties 
SET availability_status = 'occupied' 
WHERE id IN (
  SELECT DISTINCT property_id 
  FROM leases 
  WHERE status = 'active'
);

-- Add comments for documentation
COMMENT ON COLUMN properties.availability_status IS 'Property availability: available, occupied, unlisted';
COMMENT ON COLUMN properties.location IS 'Property location/address';
COMMENT ON COLUMN properties.description IS 'Property description for marketplace';
