/**
 * Notification Service
 * Handles SMS/Email notifications via Twilio and other providers
 */

import twilio from 'twilio';
import { getDatabase, generateId } from '../database/db.js';

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio client initialized');
} else {
  console.warn('⚠️  Twilio credentials not configured - SMS notifications disabled');
}

/**
 * Notification types
 */
export type NotificationType =
  | 'deposit_confirmed'
  | 'lease_expiry_30d'
  | 'lease_expiry_7d'
  | 'release_approved'
  | 'deduction_applied'
  | 'lease_completed';

/**
 * Log notification to database
 */
async function logNotification(
  leaseId: string | null,
  recipientPhone: string | null,
  recipientEmail: string | null,
  type: NotificationType,
  message: string,
  status: 'pending' | 'sent' | 'failed',
  provider: 'twilio' | 'email' | 'push',
  providerMessageId?: string,
  errorMessage?: string
): Promise<string> {
  const db = await getDatabase();
  const logId = generateId();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO notification_logs (
      id, lease_id, recipient_phone, recipient_email,
      notification_type, message, status, provider,
      provider_message_id, error_message, created_at, sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      leaseId,
      recipientPhone,
      recipientEmail,
      type,
      message,
      status,
      provider,
      providerMessageId || null,
      errorMessage || null,
      now,
      status === 'sent' ? now : null,
    ]
  );

  return logId;
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(
  to: string,
  message: string,
  leaseId: string | null,
  type: NotificationType
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.warn('⚠️  Twilio not configured, logging notification only');
    await logNotification(leaseId, to, null, type, message, 'failed', 'twilio', undefined, 'Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    console.log(`📱 Sending SMS to ${to}: ${message.substring(0, 50)}...`);

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log(`✅ SMS sent: ${result.sid}`);

    await logNotification(leaseId, to, null, type, message, 'sent', 'twilio', result.sid);

    return { success: true, messageId: result.sid };
  } catch (error: any) {
    console.error('❌ Failed to send SMS:', error.message);

    await logNotification(leaseId, to, null, type, message, 'failed', 'twilio', undefined, error.message);

    return { success: false, error: error.message };
  }
}

/**
 * Send deposit confirmation notification
 */
export async function sendDepositConfirmation(
  tenantPhone: string,
  amount: number,
  propertyName: string,
  leaseId: string
): Promise<{ success: boolean; messageId?: string }> {
  const message = `✅ Deposit Confirmed!\n\nYour security deposit of ₹${amount.toLocaleString('en-IN')} for ${propertyName} has been received and locked in escrow.\n\nLease ID: ${leaseId.substring(0, 8)}\n\nThank you for using KeyWe!`;

  const result = await sendSMS(tenantPhone, message, leaseId, 'deposit_confirmed');
  return result;
}

/**
 * Send lease expiry reminder (30 days)
 */
export async function sendLeaseExpiryReminder30Days(
  tenantPhone: string,
  propertyName: string,
  daysRemaining: number,
  leaseId: string
): Promise<{ success: boolean; messageId?: string }> {
  const message = `⏰ Lease Expiry Reminder\n\nYour lease for ${propertyName} will expire in ${daysRemaining} days.\n\nPlease ensure the property is in good condition for inspection.\n\nLease ID: ${leaseId.substring(0, 8)}`;

  const result = await sendSMS(tenantPhone, message, leaseId, 'lease_expiry_30d');
  return result;
}

/**
 * Send lease expiry reminder (7 days)
 */
export async function sendLeaseExpiryReminder7Days(
  tenantPhone: string,
  propertyName: string,
  daysRemaining: number,
  depositAmount: number,
  leaseId: string
): Promise<{ success: boolean; messageId?: string }> {
  const message = `⚠️ Lease Expiring Soon!\n\nYour lease for ${propertyName} expires in ${daysRemaining} days.\n\nDeposit: ₹${depositAmount.toLocaleString('en-IN')}\n\nEnsure property handover is complete for full refund.\n\nLease ID: ${leaseId.substring(0, 8)}`;

  const result = await sendSMS(tenantPhone, message, leaseId, 'lease_expiry_7d');
  return result;
}

/**
 * Send release notification
 */
export async function sendReleaseNotification(
  tenantPhone: string,
  refundAmount: number,
  propertyName: string,
  leaseId: string
): Promise<{ success: boolean; messageId?: string }> {
  const message = `💰 Deposit Released!\n\nYour security deposit of ₹${refundAmount.toLocaleString('en-IN')} for ${propertyName} has been released.\n\nFunds will arrive in your wallet shortly.\n\nLease ID: ${leaseId.substring(0, 8)}\n\nThank you for using KeyWe!`;

  const result = await sendSMS(tenantPhone, message, leaseId, 'release_approved');
  return result;
}

/**
 * Send deduction notice
 */
export async function sendDeductionNotice(
  tenantPhone: string,
  deductionAmount: number,
  refundAmount: number,
  reason: string,
  propertyName: string,
  leaseId: string
): Promise<{ success: boolean; messageId?: string }> {
  const message = `📋 Deposit Deduction Notice\n\nProperty: ${propertyName}\nDeduction: ₹${deductionAmount.toLocaleString('en-IN')}\nRefund: ₹${refundAmount.toLocaleString('en-IN')}\n\nReason: ${reason}\n\nLease ID: ${leaseId.substring(0, 8)}\n\nContact landlord for details.`;

  const result = await sendSMS(tenantPhone, message, leaseId, 'deduction_applied');
  return result;
}

/**
 * Send lease completion notification
 */
export async function sendLeaseCompletionNotification(
  tenantPhone: string,
  propertyName: string,
  leaseId: string
): Promise<{ success: boolean; messageId?: string }> {
  const message = `✅ Lease Completed\n\nYour lease for ${propertyName} has been successfully completed.\n\nThank you for being a responsible tenant!\n\nLease ID: ${leaseId.substring(0, 8)}`;

  const result = await sendSMS(tenantPhone, message, leaseId, 'lease_completed');
  return result;
}

/**
 * Check and send expiry reminders for all active leases
 * Should be called by cron job daily
 */
export async function checkAndSendExpiryReminders(): Promise<{
  reminders30d: number;
  reminders7d: number;
  failed: number;
}> {
  const db = await getDatabase();
  const now = new Date();

  // Calculate dates for 30 days and 7 days from now
  const date30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const date7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let reminders30d = 0;
  let reminders7d = 0;
  let failed = 0;

  try {
    // Find leases expiring in ~30 days (29-31 days)
    const leases30d: any[] = await db.all(
      `SELECT l.*, p.property_name 
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       WHERE l.status = 'active'
       AND l.lease_end_date BETWEEN ? AND ?`,
      [
        new Date(date30d.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        new Date(date30d.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      ]
    );

    // Find leases expiring in ~7 days (6-8 days)
    const leases7d: any[] = await db.all(
      `SELECT l.*, p.property_name 
       FROM leases l
       JOIN properties p ON l.property_id = p.id
       WHERE l.status = 'active'
       AND l.lease_end_date BETWEEN ? AND ?`,
      [
        new Date(date7d.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        new Date(date7d.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      ]
    );

    // Send 30-day reminders
    for (const lease of leases30d) {
      // Check if reminder already sent today
      const existingLog: any = await db.get(
        `SELECT * FROM notification_logs 
         WHERE lease_id = ? 
         AND notification_type = 'lease_expiry_30d'
         AND DATE(created_at) = DATE('now')`,
        [lease.id]
      );

      if (!existingLog && lease.tenant_wallet) {
        // In production, you'd have tenant phone number stored
        // For now, we'll skip if no phone number
        const tenantPhone = process.env.TEST_TENANT_PHONE || null;
        if (tenantPhone) {
          const result = await sendLeaseExpiryReminder30Days(
            tenantPhone,
            lease.property_name,
            30,
            lease.id
          );
          if (result.success) reminders30d++;
          else failed++;
        }
      }
    }

    // Send 7-day reminders
    for (const lease of leases7d) {
      const existingLog: any = await db.get(
        `SELECT * FROM notification_logs 
         WHERE lease_id = ? 
         AND notification_type = 'lease_expiry_7d'
         AND DATE(created_at) = DATE('now')`,
        [lease.id]
      );

      if (!existingLog && lease.tenant_wallet) {
        const tenantPhone = process.env.TEST_TENANT_PHONE || null;
        if (tenantPhone) {
          const result = await sendLeaseExpiryReminder7Days(
            tenantPhone,
            lease.property_name,
            7,
            lease.deposit_amount,
            lease.id
          );
          if (result.success) reminders7d++;
          else failed++;
        }
      }
    }

    console.log(`📊 Expiry reminders: 30d=${reminders30d}, 7d=${reminders7d}, failed=${failed}`);

    return { reminders30d, reminders7d, failed };
  } catch (error: any) {
    console.error('❌ Error checking expiry reminders:', error);
    throw error;
  }
}

/**
 * Get notification logs for a lease
 */
export async function getNotificationLogs(leaseId: string): Promise<any[]> {
  const db = await getDatabase();
  const logs = await db.all(
    `SELECT * FROM notification_logs 
     WHERE lease_id = ? 
     ORDER BY created_at DESC`,
    [leaseId]
  );
  return logs;
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byType: Record<string, number>;
}> {
  const db = await getDatabase();

  const total: any = await db.get('SELECT COUNT(*) as count FROM notification_logs');
  const sent: any = await db.get("SELECT COUNT(*) as count FROM notification_logs WHERE status = 'sent'");
  const failed: any = await db.get("SELECT COUNT(*) as count FROM notification_logs WHERE status = 'failed'");
  const pending: any = await db.get("SELECT COUNT(*) as count FROM notification_logs WHERE status = 'pending'");

  const byType: any[] = await db.all(
    'SELECT notification_type, COUNT(*) as count FROM notification_logs GROUP BY notification_type'
  );

  const byTypeMap: Record<string, number> = {};
  byType.forEach((row: any) => {
    byTypeMap[row.notification_type] = row.count;
  });

  return {
    total: total.count,
    sent: sent.count,
    failed: failed.count,
    pending: pending.count,
    byType: byTypeMap,
  };
}
