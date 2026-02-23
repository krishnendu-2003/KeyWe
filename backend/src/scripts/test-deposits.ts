/**
 * Deposit API Test Suite
 * Tests all deposit transaction endpoints
 * 
 * Run: npm run test-deposits
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const TEST_TENANT = 'GBTENANTTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const TEST_LANDLORD = 'GBLANDLORDTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
let testPropertyId: string | null = null;
let testLeaseId: string | null = null;
let testQRPayload: string | null = null;

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
  console.log('🧪 Testing Deposit API Endpoints\n');
  console.log(`API URL: ${API_URL}\n`);

  // Wait for server
  console.log('⏳ Waiting for server...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Setup: Create a test property first
    console.log('📝 Setup: Creating test property...');
    const propertyResponse = await fetch(`${API_URL}/api/properties/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landlord_wallet: TEST_LANDLORD,
        property_name: 'Deposit Test Property',
        deposit_amount: 20000,
        lease_duration: 12,
      }),
    });

    if (!propertyResponse.ok) {
      throw new Error('Failed to create test property');
    }

    const propertyData: any = await propertyResponse.json();
    testPropertyId = propertyData.property.id;
    console.log(`✅ Test property created: ${testPropertyId}\n`);

    // Generate QR for testing
    const qrResponse = await fetch(
      `${API_URL}/api/properties/${testPropertyId}/generate-qr`,
      { method: 'POST' }
    );
    const qrData: any = await qrResponse.json();
    testQRPayload = qrData.qr_payload;
    console.log(`✅ Test QR generated\n`);

    // Test 1: Validate QR - Success
    await test('POST /api/deposits/validate-qr - valid QR', async () => {
      const response = await fetch(`${API_URL}/api/deposits/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_payload: testQRPayload,
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data.success || !data.valid) {
        throw new Error('QR validation failed');
      }

      if (!data.deposit_details) {
        throw new Error('Missing deposit details');
      }

      console.log(`   Property: ${data.deposit_details.property_name}`);
      console.log(`   Amount: ₹${data.deposit_details.deposit_amount}`);
    })();

    // Test 2: Validate QR - Invalid format
    await test('POST /api/deposits/validate-qr - invalid format', async () => {
      const response = await fetch(`${API_URL}/api/deposits/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_payload: 'invalid-qr-format',
        }),
      });

      if (response.ok) {
        throw new Error('Should have rejected invalid QR format');
      }

      const error: any = await response.json();
      if (!error.error) {
        throw new Error('Missing error message');
      }
    })();

    // Test 3: Validate QR - Missing parameters
    await test('POST /api/deposits/validate-qr - missing params', async () => {
      const response = await fetch(`${API_URL}/api/deposits/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_payload: 'stellar:GESCROWXXX?asset=DEPOSIT_INR',
        }),
      });

      if (response.ok) {
        throw new Error('Should have rejected incomplete QR');
      }
    })();

    // Test 4: Build transaction - Success
    await test('POST /api/deposits/build-transaction', async () => {
      const response = await fetch(`${API_URL}/api/deposits/build-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_wallet: TEST_TENANT,
          property_id: testPropertyId,
          amount: 20000,
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        // Account might not exist on testnet - this is expected
        if (error.message?.includes('Account not found')) {
          console.log('   ⚠️  Tenant account not found (expected on testnet)');
          return;
        }
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data.success || !data.transaction) {
        throw new Error('Transaction building failed');
      }

      if (!data.transaction.xdr) {
        throw new Error('Missing XDR');
      }

      console.log(`   XDR length: ${data.transaction.xdr.length} chars`);
      console.log(`   Network: ${data.transaction.network}`);
    })();

    // Test 5: Build transaction - Invalid amount
    await test('POST /api/deposits/build-transaction - wrong amount', async () => {
      const response = await fetch(`${API_URL}/api/deposits/build-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_wallet: TEST_TENANT,
          property_id: testPropertyId,
          amount: 15000, // Wrong amount
        }),
      });

      if (response.ok) {
        throw new Error('Should have rejected wrong amount');
      }

      const error: any = await response.json();
      if (!error.error?.includes('does not match')) {
        throw new Error('Wrong error message');
      }
    })();

    // Test 6: Build transaction - Missing fields
    await test('POST /api/deposits/build-transaction - validation', async () => {
      const response = await fetch(`${API_URL}/api/deposits/build-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_wallet: TEST_TENANT,
          // Missing property_id and amount
        }),
      });

      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
    })();

    // Test 7: Submit deposit - Invalid XDR
    await test('POST /api/deposits/submit - invalid XDR', async () => {
      const response = await fetch(`${API_URL}/api/deposits/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_xdr: 'invalid-xdr',
          lease_details: {
            property_id: testPropertyId,
            tenant_wallet: TEST_TENANT,
            deposit_amount: 20000,
          },
        }),
      });

      if (response.ok) {
        throw new Error('Should have rejected invalid XDR');
      }
    })();

    // Test 8: Get deposit status - Non-existent lease
    await test('GET /api/deposits/status/:leaseId - not found', async () => {
      const response = await fetch(
        `${API_URL}/api/deposits/status/non-existent-lease-id`
      );

      if (response.status !== 404) {
        throw new Error(`Expected 404, got ${response.status}`);
      }

      const error: any = await response.json();
      if (!error.error) {
        throw new Error('Missing error message');
      }
    })();

    // Test 9: Create mock lease for status testing
    await test('Create mock lease for status testing', async () => {
      const db = await import('../database/db.js');
      const database = await db.getDatabase();
      const leaseId = db.generateId();
      const now = new Date().toISOString();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12);

      await database.run(
        `INSERT INTO leases (
          id, property_id, tenant_wallet, deposit_amount, 
          deposit_tx_hash, lease_start_date, lease_end_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          leaseId,
          testPropertyId,
          TEST_TENANT,
          20000,
          'mock_tx_hash_123',
          now,
          endDate.toISOString(),
          'active',
        ]
      );

      testLeaseId = leaseId;
      console.log(`   Mock lease created: ${leaseId}`);
    })();

    // Test 10: Get deposit status - Success
    if (testLeaseId) {
      await test('GET /api/deposits/status/:leaseId - success', async () => {
        const response = await fetch(
          `${API_URL}/api/deposits/status/${testLeaseId}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: any = await response.json();
        if (!data.success || !data.lease) {
          throw new Error('Invalid response structure');
        }

        if (!data.timeline) {
          throw new Error('Missing timeline');
        }

        console.log(`   Lease Status: ${data.lease.status}`);
        console.log(`   Progress: ${data.timeline.progress_percent}%`);
        console.log(`   Days Remaining: ${data.timeline.days_remaining}`);
        console.log(`   Total Transactions: ${data.stats.total_transactions}`);
      })();
    }

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

    console.log('\n✅ All deposit API tests completed!');

    if (failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();
