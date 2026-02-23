/**
 * Database Connection and Utilities
 * Simple SQLite database for escrow wallet management
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database | null = null;

/**
 * Initialize database connection
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const dataDir = join(__dirname, '..', '..', 'data');
  const dbPath = join(dataDir, 'escrow.db');
  
  // Create data directory if it doesn't exist
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Run schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  await db.exec(schema);

  console.log('✅ Database initialized');
  return db;
}

/**
 * Get database instance
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('✅ Database closed');
  }
}

/**
 * Generate UUID v4
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Escrow Wallet Database Operations
 */
export interface EscrowWallet {
  id: string;
  property_id: string;
  public_key: string;
  secret_key_encrypted: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'locked' | 'closed';
}

export async function createEscrowWalletRecord(
  propertyId: string,
  publicKey: string,
  secretKeyEncrypted: string
): Promise<EscrowWallet> {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await database.run(
    `INSERT INTO escrow_wallets (id, property_id, public_key, secret_key_encrypted, created_at, updated_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, propertyId, publicKey, secretKeyEncrypted, now, now, 'active']
  );

  return {
    id,
    property_id: propertyId,
    public_key: publicKey,
    secret_key_encrypted: secretKeyEncrypted,
    created_at: now,
    updated_at: now,
    status: 'active',
  };
}

export async function getEscrowWalletByPropertyId(
  propertyId: string
): Promise<EscrowWallet | null> {
  const database = await getDatabase();
  const wallet = await database.get<EscrowWallet>(
    'SELECT * FROM escrow_wallets WHERE property_id = ?',
    [propertyId]
  );
  return wallet || null;
}

export async function getEscrowWalletById(
  id: string
): Promise<EscrowWallet | null> {
  const database = await getDatabase();
  const wallet = await database.get<EscrowWallet>(
    'SELECT * FROM escrow_wallets WHERE id = ?',
    [id]
  );
  return wallet || null;
}

export async function updateEscrowWalletStatus(
  id: string,
  status: 'active' | 'locked' | 'closed'
): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.run(
    'UPDATE escrow_wallets SET status = ?, updated_at = ? WHERE id = ?',
    [status, now, id]
  );
}

/**
 * Property Database Operations
 */
export interface Property {
  id: string;
  landlord_wallet: string;
  property_name: string;
  deposit_amount: number;
  lease_duration_months: number;
  release_conditions: string | null;
  escrow_wallet_id: string | null;
  availability_status: 'available' | 'occupied' | 'unlisted';
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPropertyRecord(
  landlordWallet: string,
  propertyName: string,
  depositAmount: number,
  leaseDurationMonths: number,
  releaseConditions?: string
): Promise<Property> {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await database.run(
    `INSERT INTO properties (id, landlord_wallet, property_name, deposit_amount, lease_duration_months, release_conditions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      landlordWallet,
      propertyName,
      depositAmount,
      leaseDurationMonths,
      releaseConditions || null,
      now,
      now,
    ]
  );

  return {
    id,
    landlord_wallet: landlordWallet,
    property_name: propertyName,
    deposit_amount: depositAmount,
    lease_duration_months: leaseDurationMonths,
    release_conditions: releaseConditions || null,
    escrow_wallet_id: null,
    availability_status: 'available',
    location: null,
    description: null,
    created_at: now,
    updated_at: now,
  };
}

export async function updatePropertyEscrowWallet(
  propertyId: string,
  escrowWalletId: string
): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.run(
    'UPDATE properties SET escrow_wallet_id = ?, updated_at = ? WHERE id = ?',
    [escrowWalletId, now, propertyId]
  );
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const database = await getDatabase();
  const property = await database.get<Property>(
    'SELECT * FROM properties WHERE id = ?',
    [id]
  );
  return property || null;
}

export async function getPropertiesByLandlord(
  landlordWallet: string
): Promise<Property[]> {
  const database = await getDatabase();
  const properties = await database.all<Property[]>(
    'SELECT * FROM properties WHERE landlord_wallet = ? ORDER BY created_at DESC',
    [landlordWallet]
  );
  return properties;
}

/**
 * Get all available properties for marketplace
 */
export async function getMarketplaceProperties(): Promise<Property[]> {
  const database = await getDatabase();
  const properties = await database.all<Property[]>(
    `SELECT * FROM properties 
     WHERE availability_status = 'available' 
     ORDER BY created_at DESC`,
    []
  );
  return properties;
}

/**
 * Update property availability status
 */
export async function updatePropertyAvailability(
  propertyId: string,
  status: 'available' | 'occupied' | 'unlisted'
): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.run(
    'UPDATE properties SET availability_status = ?, updated_at = ? WHERE id = ?',
    [status, now, propertyId]
  );
}
