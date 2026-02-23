-- Database Schema for RWA Security Deposit System
-- SQLite schema for escrow wallets and related tables

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

-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    landlord_wallet TEXT NOT NULL,
    property_name TEXT NOT NULL,
    deposit_amount REAL NOT NULL,
    lease_duration_months INTEGER NOT NULL,
    release_conditions TEXT, -- JSON string
    escrow_wallet_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (escrow_wallet_id) REFERENCES escrow_wallets(id)
);

-- Leases Table
CREATE TABLE IF NOT EXISTS leases (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    tenant_wallet TEXT NOT NULL,
    deposit_amount REAL NOT NULL,
    deposit_tx_hash TEXT,
    lease_start_date DATETIME,
    lease_end_date DATETIME,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'disputed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Deposit Transactions Table
CREATE TABLE IF NOT EXISTS deposit_transactions (
    id TEXT PRIMARY KEY,
    lease_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('deposit', 'release', 'deduction', 'refund')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
    from_address TEXT,
    to_address TEXT,
    memo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_escrow_property ON escrow_wallets(property_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_wallets(status);
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_wallet);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_wallet);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_transactions_lease ON deposit_transactions(lease_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON deposit_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON deposit_transactions(status);
