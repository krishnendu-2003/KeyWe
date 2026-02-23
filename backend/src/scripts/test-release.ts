/**
 * Release API Test Suite
 * Tests all release workflow endpoints
 * 
 * Run: npm run test-release
 */

import fetch from 'node-fetch';
import { getDatabase, generateId } from '../database/db.js';

const API_URL = 'http://localhost:5000';

async function testRelease() {
  console.log('🧪 Testing Release API\n');

  try {
    // Setup: Create property and lease
    console.log('📝 Setup: Creating test data...');
    
    // 1. Create property
    const propRes = await fetch(`${API_URL}/api/properties/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landlord_wallet: 'GBLANDLORDTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        property_name: 'Release Test Property',
        deposit_amount: 30000,
        lease_duration: 12,
      }),
    });
    const propData: any = await propRes.json();
    const propertyId = propData.property.id;
    console.log(`✅ Property created: ${propertyId}\n`);

    // 2. Create mock lease
    const database = await getDatabase();
    const leaseId = generateId();
    const now = new Date();
    const startDate = new Date(now.getTime() - 350 * 24 * 60 * 60 * 1000); // 350 days ago
    const endDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

    await database.run(
      `INSERT INTO leases (
        id, property_id, tenant_wallet, deposit_amount,
        deposit_tx_hash, lease_start_date, lease_end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leaseId,
        propertyId,
        'GBTENANTTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        30000,
        'mock_deposit_tx_hash',
        startDate.toISOString(),
        endDate.toISOString(),
        'active',
      ]
    );
    console.log(`✅ Mock lease created: ${leaseId}\n`);

    // Test 1: Get Timeline
    console.log('1. Testing GET /api/release/timeline/:leaseId...');
    const timelineRes = await fetch(`${API_URL}/api/release/timeline/${leaseId}`);
    
    if (!timelineRes.ok) {
      throw new Error(`Timeline failed: ${timelineRes.status}`);
    }
    
    const timelineData: any = await timelineRes.json();
    console.log(`✅ Timeline retrieved`);
    console.log(`   Progress: ${timelineData.timeline.progress_percent}%`);
    console.log(`   Days Remaining: ${timelineData.timeline.days_remaining}`);
    console.log(`   Can Release: ${timelineData.timeline.can_release}`);
    console.log(`   Release Due: ${timelineData.timeline.is_release_due}\n`);

    // Test 2: Approve Release - No Deduction
    console.log('2. Testing POST /api/release/approve (full refund)...');
    const approveRes1 = await fetch(`${API_URL}/api/release/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lease_id: leaseId,
        deduction_amount: 0,
        reason: 'Lease completed successfully',
      }),
    });

    if (!approveRes1.ok) {
      const error: any = await approveRes1.json();
      throw new Error(`Approve failed: ${JSON.stringify(error)}`);
    }

    const approveData1: any = await approveRes1.json();
    console.log(`✅ Release approved`);
    console.log(`   Total Deposit: ₹${approveData1.approval.total_deposit}`);
    console.log(`   Refund: ₹${approveData1.approval.refund_amount}`);
    console.log(`   Deduction: ₹${approveData1.approval.deduction_amount}`);
    console.log(`   XDR Length: ${approveData1.transaction.xdr.length}\n`);

    // Test 3: Approve Release - With Deduction
    console.log('3. Testing POST /api/release/approve (with deduction)...');
    
    // Create another lease for deduction test
    const leaseId2 = generateId();
    await database.run(
      `INSERT INTO leases (
        id, property_id, tenant_wallet, deposit_amount,
        deposit_tx_hash, lease_start_date, lease_end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leaseId2,
        propertyId,
        'GBTENANT2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        30000,
        'mock_deposit_tx_hash_2',
        startDate.toISOString(),
        endDate.toISOString(),
        'active',
      ]
    );

    const approveRes2 = await fetch(`${API_URL}/api/release/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lease_id: leaseId2,
        deduction_amount: 5000,
        reason: 'Damage to property',
      }),
    });

    const approveData2: any = await approveRes2.json();
    console.log(`✅ Release with deduction approved`);
    console.log(`   Refund: ₹${approveData2.approval.refund_amount}`);
    console.log(`   Deduction: ₹${approveData2.approval.deduction_amount}`);
    console.log(`   Reason: ${approveData2.approval.reason}\n`);

    // Test 4: Invalid Deduction
    console.log('4. Testing POST /api/release/approve (invalid deduction)...');
    const approveRes3 = await fetch(`${API_URL}/api/release/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lease_id: leaseId2,
        deduction_amount: 50000, // Exceeds deposit
      }),
    });

    if (approveRes3.ok) {
      throw new Error('Should have rejected excessive deduction');
    }
    console.log(`✅ Correctly rejected excessive deduction\n`);

    // Test 5: Auto-Trigger
    console.log('5. Testing POST /api/release/auto-trigger...');
    
    // Create expired lease
    const expiredLeaseId = generateId();
    const expiredDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    
    await database.run(
      `INSERT INTO leases (
        id, property_id, tenant_wallet, deposit_amount,
        deposit_tx_hash, lease_start_date, lease_end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expiredLeaseId,
        propertyId,
        'GBTENANTEXPIREDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        30000,
        'mock_expired_tx',
        new Date(expiredDate.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        expiredDate.toISOString(),
        'active',
      ]
    );

    const triggerRes = await fetch(`${API_URL}/api/release/auto-trigger`, {
      method: 'POST',
    });

    const triggerData: any = await triggerRes.json();
    console.log(`✅ Auto-trigger executed`);
    console.log(`   Total Checked: ${triggerData.summary.total_checked}`);
    console.log(`   Triggered: ${triggerData.summary.triggered}`);
    console.log(`   Failed: ${triggerData.summary.failed}`);
    console.log(`   Skipped: ${triggerData.summary.skipped}\n`);

    // Test 6: Timeline for Non-existent Lease
    console.log('6. Testing GET /api/release/timeline/:leaseId (not found)...');
    const timelineRes2 = await fetch(`${API_URL}/api/release/timeline/fake-id`);
    
    if (timelineRes2.status !== 404) {
      throw new Error(`Expected 404, got ${timelineRes2.status}`);
    }
    console.log(`✅ Correctly returned 404 for non-existent lease\n`);

    // Test 7: Approve Non-existent Lease
    console.log('7. Testing POST /api/release/approve (lease not found)...');
    const approveRes4 = await fetch(`${API_URL}/api/release/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lease_id: 'fake-lease-id',
        deduction_amount: 0,
      }),
    });

    if (approveRes4.status !== 404) {
      throw new Error(`Expected 404, got ${approveRes4.status}`);
    }
    console.log(`✅ Correctly returned 404 for non-existent lease\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All release API tests completed successfully!');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRelease();
