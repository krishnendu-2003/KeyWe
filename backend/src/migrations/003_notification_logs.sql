-- Migration: 003_notification_logs.sql
-- Created: 2026-01-25
-- Description: Add notification logs table for tracking SMS/Email notifications

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY,
    lease_id TEXT,
    recipient_phone TEXT,
    recipient_email TEXT,
    notification_type TEXT NOT NULL CHECK(notification_type IN (
        'deposit_confirmed',
        'lease_expiry_30d',
        'lease_expiry_7d',
        'release_approved',
        'deduction_applied',
        'lease_completed'
    )),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
    provider TEXT CHECK(provider IN ('twilio', 'email', 'push')),
    provider_message_id TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_lease ON notification_logs(lease_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_phone ON notification_logs(recipient_phone);

-- Add phone number fields to leases table (for future use)
-- Note: This would require ALTER TABLE in production, handled separately

-- Record this migration
INSERT OR IGNORE INTO migrations (name) VALUES ('003_notification_logs');
