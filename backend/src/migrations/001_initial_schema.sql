-- Migration: 001_initial_schema.sql
-- Created: 2026-01-25
-- Description: Initial schema for RWA security deposit system

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    landlord_wallet TEXT NOT NULL,
    property_name TEXT NOT NULL,
    deposit_amount REAL NOT NULL CHECK(deposit_amount > 0),
    lease_duration_months INTEGER NOT NULL CHECK(lease_duration_months > 0),
    release_conditions TEXT, -- JSON string for custom release rules
    escrow_wallet_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (escrow_wallet_id) REFERENCES escrow_wallets(id) ON DELETE SET NULL
);

-- Escrow Wallets Table
CREATE TABLE IF NOT EXISTS escrow_wallets (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    public_key TEXT NOT NULL UNIQUE,
    secret_key_encrypted TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'locked', 'closed')),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Leases Table
CREATE TABLE IF NOT EXISTS leases (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    tenant_wallet TEXT NOT NULL,
    deposit_amount REAL NOT NULL CHECK(deposit_amount > 0),
    deposit_tx_hash TEXT,
    lease_start_date DATETIME,
    lease_end_date DATETIME,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'disputed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    CHECK(lease_end_date > lease_start_date)
);

-- Deposit Transactions Table
CREATE TABLE IF NOT EXISTS deposit_transactions (
    id TEXT PRIMARY KEY,
    lease_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL CHECK(amount > 0),
    type TEXT NOT NULL CHECK(type IN ('deposit', 'release', 'deduction', 'refund')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
    from_address TEXT,
    to_address TEXT,
    memo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_wallet);
CREATE INDEX IF NOT EXISTS idx_properties_escrow ON properties(escrow_wallet_id);

CREATE INDEX IF NOT EXISTS idx_escrow_property ON escrow_wallets(property_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_wallets(status);
CREATE INDEX IF NOT EXISTS idx_escrow_public_key ON escrow_wallets(public_key);

CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_wallet);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(lease_start_date, lease_end_date);

CREATE INDEX IF NOT EXISTS idx_transactions_lease ON deposit_transactions(lease_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON deposit_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON deposit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON deposit_transactions(type);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT OR IGNORE INTO migrations (name) VALUES ('001_initial_schema');
