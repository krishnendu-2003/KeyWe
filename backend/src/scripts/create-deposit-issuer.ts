/**
 * DEPOSIT_INR Token Issuer Account Creation Script
 * 
 * This script:
 * 1. Generates a new Stellar keypair for the issuer account
 * 2. Funds it on testnet using Friendbot
 * 3. Configures AUTH_REQUIRED and AUTH_REVOCABLE flags
 * 4. Saves the credentials securely
 * 
 * Run: npx tsx src/scripts/create-deposit-issuer.ts
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import fetch from 'node-fetch';
import { writeFileSync, existsSync, mkdirSync, readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const NETWORK = 'TESTNET'; // Change to 'PUBLIC' for mainnet
const HORIZON_URL = NETWORK === 'TESTNET' 
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

interface IssuerCredentials {
  publicKey: string;
  secretKey: string;
  network: string;
  createdAt: string;
  assetCode: string;
}

/**
 * Generate a new Stellar keypair
 */
function generateKeypair(): StellarSdk.Keypair {
  const keypair = StellarSdk.Keypair.random();
  console.log('✅ Generated new Stellar keypair');
  return keypair;
}

/**
 * Fund account using Friendbot (testnet only)
 */
async function fundWithFriendbot(publicKey: string): Promise<void> {
  if (NETWORK !== 'TESTNET') {
    throw new Error('Friendbot is only available on testnet');
  }

  console.log('💰 Funding account with Friendbot...');
  
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
    
    if (!response.ok) {
      throw new Error(`Friendbot request failed: ${response.statusText}`);
    }
    
    const responseJSON = await response.json();
    console.log('✅ Account funded successfully');
    console.log(`   Transaction: ${responseJSON.hash}`);
  } catch (error) {
    console.error('❌ Failed to fund account:', error);
    throw error;
  }
}

/**
 * Configure account with authorization flags
 */
async function configureAccount(keypair: StellarSdk.Keypair): Promise<void> {
  console.log('⚙️  Configuring account flags...');
  
  try {
    // Load the account
    const account = await server.loadAccount(keypair.publicKey());
    
    // Build transaction to set flags
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK === 'TESTNET' 
        ? StellarSdk.Networks.TESTNET 
        : StellarSdk.Networks.PUBLIC,
    })
      .addOperation(
        StellarSdk.Operation.setOptions({
          setFlags: 
            StellarSdk.AuthRequiredFlag | // Requires authorization to hold assets
            StellarSdk.AuthRevocableFlag,  // Can revoke authorization (compliance)
        })
      )
      .setTimeout(180)
      .build();
    
    // Sign and submit
    transaction.sign(keypair);
    const result = await server.submitTransaction(transaction);
    
    console.log('✅ Account flags configured successfully');
    console.log(`   AUTH_REQUIRED: enabled`);
    console.log(`   AUTH_REVOCABLE: enabled`);
    console.log(`   Transaction: ${result.hash}`);
  } catch (error) {
    console.error('❌ Failed to configure account:', error);
    throw error;
  }
}

/**
 * Save issuer credentials to secure file
 */
function saveCredentials(credentials: IssuerCredentials): void {
  const credentialsDir = join(__dirname, '..', '..', 'credentials');
  const credentialsFile = join(credentialsDir, 'issuer-credentials.json');
  
  // Create credentials directory if it doesn't exist
  if (!existsSync(credentialsDir)) {
    mkdirSync(credentialsDir, { recursive: true });
  }
  
  // Save credentials
  writeFileSync(
    credentialsFile,
    JSON.stringify(credentials, null, 2),
    { mode: 0o600 } // Read/write for owner only
  );
  
  console.log('✅ Credentials saved to:', credentialsFile);
  console.log('⚠️  IMPORTANT: Keep this file secure and never commit to git!');
}

/**
 * Update .env file with issuer public key
 */
function updateEnvFile(publicKey: string): void {
  const envPath = join(__dirname, '..', '..', '.env');
  const envExamplePath = join(__dirname, '..', '..', '.env.example');
  
  const envContent = `
# DEPOSIT_INR Token Issuer
DEPOSIT_ISSUER_PUBLIC_KEY=${publicKey}
DEPOSIT_ASSET_CODE=DEPOSIT_INR

# Stellar Network
STELLAR_NETWORK=${NETWORK}
STELLAR_HORIZON_URL=${HORIZON_URL}
`;

  // Update .env
  if (existsSync(envPath)) {
    const existingContent = readFileSync(envPath, 'utf-8');
    if (!existingContent.includes('DEPOSIT_ISSUER_PUBLIC_KEY')) {
      appendFileSync(envPath, envContent);
      console.log('✅ Updated .env file');
    } else {
      console.log('⚠️  .env already contains DEPOSIT_ISSUER_PUBLIC_KEY');
    }
  } else {
    writeFileSync(envPath, envContent.trim());
    console.log('✅ Created .env file');
  }
  
  // Update .env.example (without secret key)
  const exampleContent = `
# DEPOSIT_INR Token Issuer
DEPOSIT_ISSUER_PUBLIC_KEY=YOUR_ISSUER_PUBLIC_KEY_HERE
DEPOSIT_ASSET_CODE=DEPOSIT_INR

# Stellar Network
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
`;
  
  if (!existsSync(envExamplePath)) {
    writeFileSync(envExamplePath, exampleContent.trim());
    console.log('✅ Created .env.example file');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Creating DEPOSIT_INR Token Issuer Account\n');
  console.log(`Network: ${NETWORK}`);
  console.log(`Horizon: ${HORIZON_URL}\n`);
  
  try {
    // Step 1: Generate keypair
    const issuerKeypair = generateKeypair();
    console.log(`   Public Key:  ${issuerKeypair.publicKey()}`);
    console.log(`   Secret Key:  ${issuerKeypair.secret().substring(0, 10)}...\n`);
    
    // Step 2: Fund account (testnet only)
    if (NETWORK === 'TESTNET') {
      await fundWithFriendbot(issuerKeypair.publicKey());
      console.log('');
      
      // Wait for account to be created
      console.log('⏳ Waiting for account creation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('');
    } else {
      console.log('⚠️  MAINNET: You need to fund this account manually');
      console.log(`   Send XLM to: ${issuerKeypair.publicKey()}\n`);
      return;
    }
    
    // Step 3: Configure account flags
    await configureAccount(issuerKeypair);
    console.log('');
    
    // Step 4: Save credentials
    const credentials: IssuerCredentials = {
      publicKey: issuerKeypair.publicKey(),
      secretKey: issuerKeypair.secret(),
      network: NETWORK,
      createdAt: new Date().toISOString(),
      assetCode: 'DEPOSIT_INR',
    };
    
    saveCredentials(credentials);
    console.log('');
    
    // Step 5: Update .env
    updateEnvFile(issuerKeypair.publicKey());
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ DEPOSIT_INR Issuer Account Created Successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Account Details:');
    console.log(`   Public Key:  ${issuerKeypair.publicKey()}`);
    console.log(`   Asset Code:  DEPOSIT_INR`);
    console.log(`   Network:     ${NETWORK}`);
    console.log('');
    console.log('🔐 Security:');
    console.log('   ✓ AUTH_REQUIRED enabled');
    console.log('   ✓ AUTH_REVOCABLE enabled');
    console.log('');
    console.log('📁 Files Created:');
    console.log('   ✓ backend/credentials/issuer-credentials.json');
    console.log('   ✓ backend/.env');
    console.log('');
    console.log('🔗 View on Stellar Expert:');
    const explorerUrl = NETWORK === 'TESTNET'
      ? `https://stellar.expert/explorer/testnet/account/${issuerKeypair.publicKey()}`
      : `https://stellar.expert/explorer/public/account/${issuerKeypair.publicKey()}`;
    console.log(`   ${explorerUrl}`);
    console.log('');
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Add credentials/issuer-credentials.json to .gitignore');
    console.log('   2. Back up the secret key securely');
    console.log('   3. Run the token issuance script');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error creating issuer account:', error);
    process.exit(1);
  }
}

// Run the script
main();
