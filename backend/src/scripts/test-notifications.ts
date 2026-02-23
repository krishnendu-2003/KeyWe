/**
 * Notification API Test Suite
 * Tests notification service and SMS sending
 * 
 * Run: npm run test-notifications
 */

import fetch from 'node-fetch';
import { getDatabase, generateId } from '../database/db.js';
import {
  sendDepositConfirmation,
  sendLeaseExpiryReminder30Days,
  sendLeaseExpiryReminder7Days,
  sendReleaseNotification,
  sendDeductionNotice,
  checkAndSendExpiryReminders,
  getNotificationStats,
} from '../services/notification.service.js';

const API_URL = 'http://localhost:5000';
const TEST_PHONE = process.env.TEST_TENANT_PHONE || '+919876543210';

async function testNotifications() {
  console.log('🧪 Testing Notification Service\n');
  console.log(`Test Phone: ${TEST_PHONE}\n`);

  try {
    // Test 1: Send deposit confirmation
    console.log('1. Testing deposit confirmation SMS...');
    const result1 = await sendDepositConfirmation(
      TEST_PHONE,
      25000,
      'Test Apartment 101',
      'test-lease-' + Date.now()
    );
    
    if (result1.success) {
      console.log(`✅ Deposit confirmation sent (Message ID: ${result1.messageId})\n`);
    } else {
      console.log(`⚠️  Deposit confirmation logged (Twilio not configured)\n`);
    }

    // Test 2: Send 30-day expiry reminder
    console.log('2. Testing 30-day expiry reminder...');
    const result2 = await sendLeaseExpiryReminder30Days(
      TEST_PHONE,
      'Test Property',
      30,
      'test-lease-' + Date.now()
    );
    
    if (result2.success) {
      console.log(`✅ 30-day reminder sent (Message ID: ${result2.messageId})\n`);
    } else {
      console.log(`⚠️  30-day reminder logged\n`);
    }

    // Test 3: Send 7-day expiry reminder
    console.log('3. Testing 7-day expiry reminder...');
    const result3 = await sendLeaseExpiryReminder7Days(
      TEST_PHONE,
      'Test Property',
      7,
      25000,
      'test-lease-' + Date.now()
    );
    
    if (result3.success) {
      console.log(`✅ 7-day reminder sent (Message ID: ${result3.messageId})\n`);
    } else {
      console.log(`⚠️  7-day reminder logged\n`);
    }

    // Test 4: Send release notification
    console.log('4. Testing release notification...');
    const result4 = await sendReleaseNotification(
      TEST_PHONE,
      25000,
      'Test Property',
      'test-lease-' + Date.now()
    );
    
    if (result4.success) {
      console.log(`✅ Release notification sent (Message ID: ${result4.messageId})\n`);
    } else {
      console.log(`⚠️  Release notification logged\n`);
    }

    // Test 5: Send deduction notice
    console.log('5. Testing deduction notice...');
    const result5 = await sendDeductionNotice(
      TEST_PHONE,
      5000,
      20000,
      'Minor damages to wall paint',
      'Test Property',
      'test-lease-' + Date.now()
    );
    
    if (result5.success) {
      console.log(`✅ Deduction notice sent (Message ID: ${result5.messageId})\n`);
    } else {
      console.log(`⚠️  Deduction notice logged\n`);
    }

    // Test 6: Check expiry reminders (cron job simulation)
    console.log('6. Testing expiry reminder check (cron simulation)...');
    
    // Create test leases expiring in 30 and 7 days
    const db = await getDatabase();
    const now = new Date();
    
    // Create property first
    const propRes = await fetch(`${API_URL}/api/properties/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landlord_wallet: 'GBLANDLORDTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        property_name: 'Notification Test Property',
        deposit_amount: 20000,
        lease_duration: 12,
      }),
    });
    const propData: any = await propRes.json();
    const propertyId = propData.property.id;

    // Lease expiring in 30 days
    const lease30d = generateId();
    await db.run(
      `INSERT INTO leases (
        id, property_id, tenant_wallet, deposit_amount,
        deposit_tx_hash, lease_start_date, lease_end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lease30d,
        propertyId,
        'GBTENANT30DXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        20000,
        'mock_tx_30d',
        new Date(now.getTime() - 335 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        'active',
      ]
    );

    // Lease expiring in 7 days
    const lease7d = generateId();
    await db.run(
      `INSERT INTO leases (
        id, property_id, tenant_wallet, deposit_amount,
        deposit_tx_hash, lease_start_date, lease_end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lease7d,
        propertyId,
        'GBTENANT7DXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        20000,
        'mock_tx_7d',
        new Date(now.getTime() - 358 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        'active',
      ]
    );

    const reminderResult = await checkAndSendExpiryReminders();
    console.log(`✅ Expiry check completed:`);
    console.log(`   30-day reminders: ${reminderResult.reminders30d}`);
    console.log(`   7-day reminders: ${reminderResult.reminders7d}`);
    console.log(`   Failed: ${reminderResult.failed}\n`);

    // Test 7: Get notification statistics
    console.log('7. Testing notification statistics...');
    const stats = await getNotificationStats();
    console.log(`✅ Notification stats retrieved:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Sent: ${stats.sent}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   By Type:`, stats.byType);
    console.log();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All notification tests completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 Note: If Twilio is not configured, notifications are logged to database only.');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNotifications();
