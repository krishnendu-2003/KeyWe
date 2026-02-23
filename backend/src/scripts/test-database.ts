/**
 * Comprehensive Database Tests
 * Tests all tables, constraints, and relationships
 * 
 * Run: npm run test-database
 */

import {
  initDatabase,
  getDatabase,
  generateId,
  createPropertyRecord,
  getPropertyById,
  getPropertiesByLandlord,
  createEscrowWalletRecord,
  getEscrowWalletByPropertyId,
  updateEscrowWalletStatus,
} from '../database/db.js';
import { runMigrations } from './migrate.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✅ ${name}`);
    } catch (error: any) {
      results.push({ name, passed: false, error: error.message });
      console.error(`❌ ${name}: ${error.message}`);
    }
  };
}

async function main() {
  console.log('🧪 Running Database Tests\n');
  
  try {
    // Initialize database and run migrations
    console.log('📝 Step 1: Initializing database and running migrations...');
    await initDatabase();
    await runMigrations();
    console.log('');
    
    const db = await getDatabase();
    
    // Test 1: Properties table
    await test('Create property record', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Test Property 1',
        25000,
        12,
        JSON.stringify({ cleaningRequired: true })
      );
      
      if (!property.id || !property.property_name) {
        throw new Error('Property not created correctly');
      }
    })();
    
    // Test 2: Retrieve property
    await test('Retrieve property by ID', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Test Property 2',
        30000,
        6
      );
      
      const retrieved = await getPropertyById(property.id);
      if (!retrieved || retrieved.property_name !== 'Test Property 2') {
        throw new Error('Property retrieval failed');
      }
    })();
    
    // Test 3: Get properties by landlord
    await test('Get properties by landlord wallet', async () => {
      const landlordWallet = 'GBLANDLORD3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      
      await createPropertyRecord(landlordWallet, 'Property A', 20000, 12);
      await createPropertyRecord(landlordWallet, 'Property B', 25000, 12);
      
      const properties = await getPropertiesByLandlord(landlordWallet);
      if (properties.length < 2) {
        throw new Error('Failed to retrieve multiple properties');
      }
    })();
    
    // Test 4: Escrow wallet creation
    await test('Create escrow wallet', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD4XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property with Escrow',
        20000,
        12
      );
      
      const escrow = await createEscrowWalletRecord(
        property.id,
        'GESCROWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'encrypted_secret_key_here'
      );
      
      if (!escrow.id || !escrow.public_key) {
        throw new Error('Escrow wallet not created');
      }
    })();
    
    // Test 5: Escrow wallet retrieval
    await test('Retrieve escrow by property ID', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD5XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property 5',
        20000,
        12
      );
      
      const escrow = await createEscrowWalletRecord(
        property.id,
        'GESCROW2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'encrypted_key'
      );
      
      const retrieved = await getEscrowWalletByPropertyId(property.id);
      if (!retrieved || retrieved.id !== escrow.id) {
        throw new Error('Escrow retrieval failed');
      }
    })();
    
    // Test 6: Escrow status update
    await test('Update escrow wallet status', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD6XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property 6',
        20000,
        12
      );
      
      const escrow = await createEscrowWalletRecord(
        property.id,
        'GESCROW3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'encrypted_key'
      );
      
      await updateEscrowWalletStatus(escrow.id, 'locked');
      
      const updated = await getEscrowWalletByPropertyId(property.id);
      if (updated?.status !== 'locked') {
        throw new Error('Status update failed');
      }
    })();
    
    // Test 7: Lease creation
    await test('Create lease record', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property 7',
        20000,
        12
      );
      
      const leaseId = generateId();
      const now = new Date().toISOString();
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      await db.run(
        `INSERT INTO leases (id, property_id, tenant_wallet, deposit_amount, lease_start_date, lease_end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [leaseId, property.id, 'GBTENANTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 20000, now, endDate, 'pending']
      );
      
      const lease = await db.get('SELECT * FROM leases WHERE id = ?', [leaseId]);
      if (!lease) {
        throw new Error('Lease creation failed');
      }
    })();
    
    // Test 8: Deposit transaction creation
    await test('Create deposit transaction', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD8XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property 8',
        20000,
        12
      );
      
      const leaseId = generateId();
      const now = new Date().toISOString();
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      await db.run(
        `INSERT INTO leases (id, property_id, tenant_wallet, deposit_amount, lease_start_date, lease_end_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [leaseId, property.id, 'GBTENANT2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 20000, now, endDate]
      );
      
      const txId = generateId();
      await db.run(
        `INSERT INTO deposit_transactions (id, lease_id, tx_hash, amount, type, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [txId, leaseId, 'txhash123456', 20000, 'deposit', 'confirmed']
      );
      
      const tx = await db.get('SELECT * FROM deposit_transactions WHERE id = ?', [txId]);
      if (!tx || tx.type !== 'deposit') {
        throw new Error('Transaction creation failed');
      }
    })();
    
    // Test 9: Foreign key constraints
    await test('Foreign key constraint enforcement', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD9XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property 9',
        20000,
        12
      );
      
      // Try to create lease with non-existent property
      try {
        const leaseId = generateId();
        await db.run(
          `INSERT INTO leases (id, property_id, tenant_wallet, deposit_amount)
           VALUES (?, ?, ?, ?)`,
          [leaseId, 'non-existent-id', 'GBTENANT3XXX', 20000]
        );
        throw new Error('Foreign key constraint not enforced');
      } catch (error: any) {
        if (!error.message.includes('FOREIGN KEY')) {
          throw new Error('Wrong error type');
        }
      }
    })();
    
    // Test 10: Check constraints
    await test('Check constraint enforcement', async () => {
      try {
        // Try to create property with negative deposit
        await createPropertyRecord(
          'GBLANDLORD10XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          'Invalid Property',
          -1000, // Negative amount
          12
        );
        throw new Error('Check constraint not enforced');
      } catch (error: any) {
        if (!error.message.includes('CHECK')) {
          throw new Error('Wrong error type');
        }
      }
    })();
    
    // Test 11: Unique constraints
    await test('Unique constraint enforcement', async () => {
      const publicKey = 'GUNIQUEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      
      const property1 = await createPropertyRecord(
        'GBLANDLORD11XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property 11',
        20000,
        12
      );
      
      await createEscrowWalletRecord(property1.id, publicKey, 'encrypted1');
      
      // Try to create another escrow with same public key
      try {
        const property2 = await createPropertyRecord(
          'GBLANDLORD12XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          'Property 12',
          20000,
          12
        );
        
        await createEscrowWalletRecord(property2.id, publicKey, 'encrypted2');
        throw new Error('Unique constraint not enforced');
      } catch (error: any) {
        if (!error.message.includes('UNIQUE')) {
          throw new Error('Wrong error type');
        }
      }
    })();
    
    // Test 12: Cascade delete
    await test('Cascade delete on property deletion', async () => {
      const property = await createPropertyRecord(
        'GBLANDLORD13XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'Property 13',
        20000,
        12
      );
      
      const escrow = await createEscrowWalletRecord(
        property.id,
        'GESCROW13XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'encrypted'
      );
      
      // Link escrow to property (this creates the bidirectional relationship)
      await db.run(
        'UPDATE properties SET escrow_wallet_id = ? WHERE id = ?',
        [escrow.id, property.id]
      );
      
      // Verify escrow exists
      const escrowBefore = await db.get(
        'SELECT * FROM escrow_wallets WHERE id = ?',
        [escrow.id]
      );
      
      if (!escrowBefore) {
        throw new Error('Escrow not created properly');
      }
      
      // Delete property - this should cascade delete the escrow
      // The escrow_wallets table has: FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      // So when property is deleted, escrow should be deleted too
      await db.run('DELETE FROM properties WHERE id = ?', [property.id]);
      
      // Escrow should be deleted too (cascade)
      const escrowAfterDelete = await db.get(
        'SELECT * FROM escrow_wallets WHERE id = ?',
        [escrow.id]
      );
      
      if (escrowAfterDelete) {
        throw new Error('Cascade delete not working - escrow still exists after property deletion');
      }
    })();
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════════════════════');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
    }
    
    console.log('\n✅ All database tests completed!');
    
    if (failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();
