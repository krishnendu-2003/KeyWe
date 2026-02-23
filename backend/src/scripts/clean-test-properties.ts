/**
 * Delete ALL Test Properties
 * Keeps only Building A and Building B
 */

import { getDatabase } from '../database/db.js';

async function deleteAllTestProperties() {
  try {
    const db = await getDatabase();
    
    console.log('🗑️  Deleting all test properties...\n');
    
    // Keep only Building A and Building B
    const keepProperties = ['Building A', 'Building B'];
    
    // Delete all properties NOT in the keep list
    const result = await db.run(
      `DELETE FROM properties 
       WHERE property_name NOT IN (?, ?)`,
      keepProperties
    );
    
    console.log(`✅ Deleted ${result.changes} test properties\n`);
    
    // Also clean up orphaned escrow wallets
    await db.run(`
      DELETE FROM escrow_wallets 
      WHERE property_id NOT IN (SELECT id FROM properties)
    `);
    console.log('✅ Cleaned up orphaned escrow wallets\n');
    
    // Also clean up orphaned leases
    await db.run(`
      DELETE FROM leases 
      WHERE property_id NOT IN (SELECT id FROM properties)
    `);
    console.log('✅ Cleaned up orphaned leases\n');
    
    console.log('📋 Remaining properties:\n');
    
    const remaining = await db.all(
      'SELECT id, property_name, landlord_wallet, deposit_amount FROM properties ORDER BY created_at DESC'
    );
    
    remaining.forEach((prop: any, index: number) => {
      console.log(`${index + 1}. ${prop.property_name}`);
      console.log(`   Landlord: ${prop.landlord_wallet.slice(0, 8)}...${prop.landlord_wallet.slice(-8)}`);
      console.log(`   Deposit: ₹${prop.deposit_amount.toLocaleString('en-IN')}`);
      console.log('');
    });
    
    console.log(`✅ Database cleaned! ${remaining.length} real properties remaining.`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteAllTestProperties();
