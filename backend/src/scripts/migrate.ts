/**
 * Database Migration Runner
 * Applies SQL migrations in order
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get list of migration files
 */
function getMigrationFiles(): string[] {
  const migrationsDir = join(__dirname, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Alphabetical order ensures 001, 002, 003...
  
  return files;
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(name: string): Promise<boolean> {
  const db = await getDatabase();
  
  // Create migrations table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  const result = await db.get(
    'SELECT name FROM migrations WHERE name = ?',
    [name]
  );
  
  return !!result;
}

/**
 * Apply a single migration
 */
async function applyMigration(filename: string): Promise<void> {
  const db = await getDatabase();
  const migrationsDir = join(__dirname, '..', 'migrations');
  const filepath = join(migrationsDir, filename);
  
  console.log(`📝 Applying migration: ${filename}`);
  
  try {
    // Read migration SQL
    const sql = readFileSync(filepath, 'utf-8');
    
    // Execute migration
    await db.exec(sql);
    
    // Record migration (if not already recorded by the SQL itself)
    await db.run(
      'INSERT OR IGNORE INTO migrations (name) VALUES (?)',
      [filename]
    );
    
    console.log(`✅ Migration applied: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('🚀 Running database migrations...\n');
  
  const migrationFiles = getMigrationFiles();
  
  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found');
    return;
  }
  
  let appliedCount = 0;
  
  for (const file of migrationFiles) {
    const alreadyApplied = await isMigrationApplied(file);
    
    if (alreadyApplied) {
      console.log(`⏭️  Skipping (already applied): ${file}`);
      continue;
    }
    
    await applyMigration(file);
    appliedCount++;
  }
  
  console.log(`\n✅ Migrations complete! Applied ${appliedCount} new migration(s)`);
}

/**
 * Show migration status
 */
export async function showMigrationStatus(): Promise<void> {
  const db = await getDatabase();
  
  // Ensure migrations table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  const applied = await db.all('SELECT name, applied_at FROM migrations ORDER BY applied_at');
  const allFiles = getMigrationFiles();
  
  console.log('\n📊 Migration Status:\n');
  console.log('Applied Migrations:');
  
  if (applied.length === 0) {
    console.log('  (none)');
  } else {
    for (const migration of applied) {
      console.log(`  ✅ ${migration.name} (${migration.applied_at})`);
    }
  }
  
  const pending = allFiles.filter(f => !applied.find(m => m.name === f));
  
  console.log('\nPending Migrations:');
  if (pending.length === 0) {
    console.log('  (none)');
  } else {
    for (const file of pending) {
      console.log(`  ⏳ ${file}`);
    }
  }
  
  console.log('');
}

/**
 * CLI runner
 */
async function main() {
  const command = process.argv[2];
  
  try {
    if (command === 'status') {
      await showMigrationStatus();
    } else {
      await runMigrations();
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
