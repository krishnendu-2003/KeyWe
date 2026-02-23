/**
 * Simple Deposit API Manual Test
 * Quick verification of deposit endpoints
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testDeposits() {
  console.log('🧪 Testing Deposit API\n');

  try {
    // Test 1: Health check
    console.log('1. Testing server health...');
    const healthRes = await fetch(`${API_URL}/health`);
    const health: any = await healthRes.json();
    console.log(`✅ Server is ${health.status}\n`);

    // Test 2: Create property
    console.log('2. Creating test property...');
    const propRes = await fetch(`${API_URL}/api/properties/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landlord_wallet: 'GBLANDLORDTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        property_name: 'Quick Test Property',
        deposit_amount: 15000,
        lease_duration: 6,
      }),
    });
    
    if (!propRes.ok) {
      const error: any = await propRes.json();
      throw new Error(`Property creation failed: ${JSON.stringify(error)}`);
    }
    
    const propData: any = await propRes.json();
    console.log(`✅ Property created: ${propData.property.id}`);
    console.log(`   Escrow: ${propData.property.escrow_address}\n`);

    // Test 3: Generate QR
    console.log('3. Generating QR code...');
    const qrRes = await fetch(
      `${API_URL}/api/properties/${propData.property.id}/generate-qr`,
      { method: 'POST' }
    );
    const qrData: any = await qrRes.json();
    console.log(`✅ QR generated`);
    console.log(`   Payload: ${qrData.qr_payload.substring(0, 80)}...\n`);

    // Test 4: Validate QR
    console.log('4. Validating QR code...');
    const validateRes = await fetch(`${API_URL}/api/deposits/validate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_payload: qrData.qr_payload }),
    });
    
    if (!validateRes.ok) {
      const error: any = await validateRes.json();
      throw new Error(`QR validation failed: ${JSON.stringify(error)}`);
    }
    
    const validateData: any = await validateRes.json();
    console.log(`✅ QR validated`);
    console.log(`   Property: ${validateData.deposit_details.property_name}`);
    console.log(`   Amount: ₹${validateData.deposit_details.deposit_amount}\n`);

    // Test 5: Test invalid QR
    console.log('5. Testing invalid QR (should fail)...');
    const invalidRes = await fetch(`${API_URL}/api/deposits/validate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_payload: 'invalid-qr' }),
    });
    
    if (invalidRes.ok) {
      throw new Error('Should have rejected invalid QR');
    }
    console.log(`✅ Invalid QR correctly rejected\n`);

    // Test 6: Test build transaction (will fail on testnet - account doesn't exist)
    console.log('6. Testing build transaction...');
    const buildRes = await fetch(`${API_URL}/api/deposits/build-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_wallet: 'GBTENANTTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        property_id: propData.property.id,
        amount: 15000,
      }),
    });
    
    if (!buildRes.ok) {
      const error: any = await buildRes.json();
      if (error.message?.includes('Account not found')) {
        console.log(`⚠️  Expected error: Tenant account not found on testnet\n`);
      } else {
        console.log(`❌ Unexpected error: ${JSON.stringify(error)}\n`);
      }
    } else {
      const buildData: any = await buildRes.json();
      console.log(`✅ Transaction built`);
      console.log(`   XDR length: ${buildData.transaction.xdr.length}\n`);
    }

    // Test 7: Test status endpoint (no lease yet)
    console.log('7. Testing status endpoint (should 404)...');
    const statusRes = await fetch(`${API_URL}/api/deposits/status/fake-lease-id`);
    if (statusRes.status === 404) {
      console.log(`✅ Correctly returned 404 for non-existent lease\n`);
    } else {
      console.log(`❌ Expected 404, got ${statusRes.status}\n`);
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All manual tests completed successfully!');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDeposits();
