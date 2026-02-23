-- Migration: 002_release_approvals.sql
-- Created: 2026-01-25
-- Description: Add release_approvals table for tracking deposit releases

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Release Approvals Table
CREATE TABLE IF NOT EXISTS release_approvals (
    id TEXT PRIMARY KEY,
    lease_id TEXT NOT NULL,
    deduction_amount REAL NOT NULL DEFAULT 0 CHECK(deduction_amount >= 0),
    refund_amount REAL NOT NULL CHECK(refund_amount >= 0),
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'executed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    executed_at DATETIME,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_release_approvals_lease ON release_approvals(lease_id);
CREATE INDEX IF NOT EXISTS idx_release_approvals_status ON release_approvals(status);
CREATE INDEX IF NOT EXISTS idx_release_approvals_created ON release_approvals(created_at);

-- Add pending_release status to leases table
-- Note: This is handled by CHECK constraint update in application logic

-- Record this migration
INSERT OR IGNORE INTO migrations (name) VALUES ('002_release_approvals');
