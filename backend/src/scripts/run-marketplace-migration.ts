/**
 * Run Database Migration for Marketplace Support
 */

import { getDatabase } from '../database/db.js';

async function runMigration() {
  try {
    const db = await getDatabase();
    
    console.log('🔄 Running marketplace migration...');
    
    // Add new columns
    await db.exec(`
      ALTER TABLE properties ADD COLUMN availability_status TEXT DEFAULT 'available';
    `);
    console.log('✅ Added availability_status column');
    
    await db.exec(`
      ALTER TABLE properties ADD COLUMN location TEXT;
    `);
    console.log('✅ Added location column');
    
    await db.exec(`
      ALTER TABLE properties ADD COLUMN description TEXT;
    `);
    console.log('✅ Added description column');
    
    // Create index
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_properties_availability ON properties(availability_status);
    `);
    console.log('✅ Created availability index');
    
    // Update existing properties with active leases
    await db.exec(`
      UPDATE properties 
      SET availability_status = 'occupied' 
      WHERE id IN (
        SELECT DISTINCT property_id 
        FROM leases 
        WHERE status = 'active'
      );
    `);
    console.log('✅ Updated existing property statuses');
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️  Migration already applied');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
