/**
 * Property API Test Suite
 * Tests all property management endpoints
 * 
 * Run: npm run test-api
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const TEST_LANDLORD = 'GBLANDLORDTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];
let createdPropertyId: string | null = null;

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
  console.log('🧪 Testing Property API Endpoints\n');
  console.log(`API URL: ${API_URL}\n`);

  // Wait for server to be ready
  console.log('⏳ Waiting for server...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Test 1: Health check
    await test('Health check endpoint', async () => {
      const response = await fetch(`${API_URL}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data: any = await response.json();
      if (data.status !== 'ok') {
        throw new Error('Health check status not ok');
      }
    })();

    // Test 2: Create property
    await test('POST /api/properties/create', async () => {
      const response = await fetch(`${API_URL}/api/properties/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlord_wallet: TEST_LANDLORD,
          property_name: 'Test Apartment 101',
          deposit_amount: 25000,
          lease_duration: 12,
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data.success || !data.property) {
        throw new Error('Invalid response structure');
      }

      createdPropertyId = data.property.id;
      console.log(`   Property ID: ${createdPropertyId}`);
      console.log(`   Escrow Address: ${data.property.escrow_address}`);
    })();

    // Test 3: Create property with validation errors
    await test('POST /api/properties/create - validation', async () => {
      const response = await fetch(`${API_URL}/api/properties/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlord_wallet: TEST_LANDLORD,
          property_name: 'Invalid Property',
          deposit_amount: -1000, // Invalid negative amount
          lease_duration: 12,
        }),
      });

      if (response.ok) {
        throw new Error('Should have rejected negative deposit amount');
      }

      const error: any = await response.json();
      if (!error.error) {
        throw new Error('Error response missing error field');
      }
    })();

    // Test 4: Get properties by landlord
    await test('GET /api/properties/:landlordWallet', async () => {
      const response = await fetch(`${API_URL}/api/properties/${TEST_LANDLORD}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data.success || !Array.isArray(data.properties)) {
        throw new Error('Invalid response structure');
      }

      if (data.properties.length === 0) {
        throw new Error('No properties found for landlord');
      }

      console.log(`   Found ${data.count} properties`);
    })();

    // Test 5: Generate QR code
    if (!createdPropertyId) {
      throw new Error('No property ID available for QR generation');
    }

    await test('POST /api/properties/:propertyId/generate-qr', async () => {
      const response = await fetch(
        `${API_URL}/api/properties/${createdPropertyId}/generate-qr`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data.success || !data.qr_payload) {
        throw new Error('Invalid response structure');
      }

      if (!data.qr_payload.startsWith('stellar:')) {
        throw new Error('Invalid QR payload format');
      }

      console.log(`   QR Payload: ${data.qr_payload.substring(0, 50)}...`);
      console.log(`   Deposit Amount: ₹${data.metadata.deposit_amount}`);
    })();

    // Test 6: Get property details
    await test('GET /api/properties/details/:propertyId', async () => {
      const response = await fetch(
        `${API_URL}/api/properties/details/${createdPropertyId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data.success || !data.property) {
        throw new Error('Invalid response structure');
      }

      if (!data.escrow) {
        throw new Error('Escrow details missing');
      }

      if (!Array.isArray(data.leases)) {
        throw new Error('Leases array missing');
      }

      console.log(`   Property: ${data.property.property_name}`);
      console.log(`   Escrow Status: ${data.escrow.status}`);
      console.log(`   Total Leases: ${data.stats.total_leases}`);
    })();

    // Test 7: Get non-existent property
    await test('GET /api/properties/details/:propertyId - not found', async () => {
      const response = await fetch(
        `${API_URL}/api/properties/details/non-existent-id`
      );

      if (response.status !== 404) {
        throw new Error(`Expected 404, got ${response.status}`);
      }

      const error: any = await response.json();
      if (!error.error) {
        throw new Error('Error response missing error field');
      }
    })();

    // Test 8: Invalid Stellar address format
    await test('GET /api/properties/:landlordWallet - invalid address', async () => {
      const response = await fetch(`${API_URL}/api/properties/INVALID_ADDRESS`);

      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }
    })();

    // Test 9: Create multiple properties
    await test('Create multiple properties for same landlord', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${API_URL}/api/properties/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            landlord_wallet: TEST_LANDLORD,
            property_name: `Test Property ${i + 2}`,
            deposit_amount: 20000 + i * 5000,
            lease_duration: 6 + i * 6,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create property ${i + 2}`);
        }
      }

      // Verify all properties are listed
      const listResponse = await fetch(`${API_URL}/api/properties/${TEST_LANDLORD}`);
      const listData: any = await listResponse.json();

      if (listData.count < 4) {
        throw new Error(`Expected at least 4 properties, got ${listData.count}`);
      }

      console.log(`   Created 3 additional properties (total: ${listData.count})`);
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

    console.log('\n✅ All API tests completed!');

    if (failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
main();
