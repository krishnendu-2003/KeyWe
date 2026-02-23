/**
 * DEPOSIT_INR Token Issuance Script
 * 
 * This script issues DEPOSIT_INR tokens from the issuer account.
 * It can be used to:
 * 1. Issue tokens to a distribution account
 * 2. Authorize trustlines for specific accounts
 * 3. Manage token supply
 * 
 * Run: npx tsx src/scripts/issue-deposit-tokens.ts
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ASSET_CODE = 'DEPOSIT_INR';

interface IssuerCredentials {
  publicKey: string;
  secretKey: string;
  network: string;
  assetCode: string;
}

/**
 * Load issuer credentials from file
 */
function loadIssuerCredentials(): IssuerCredentials {
  const credentialsPath = path.join(__dirname, '..', '..', 'credentials', 'issuer-credentials.json');
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error('Issuer credentials not found. Run create-deposit-issuer.ts first.');
  }
  
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  return credentials;
}

/**
 * Create DEPOSIT_INR asset object
 */
function createAsset(issuerPublicKey: string): StellarSdk.Asset {
  return new StellarSdk.Asset(ASSET_CODE, issuerPublicKey);
}

/**
 * Authorize a trustline for an account
 */
async function authorizeTrustline(
  issuerKeypair: StellarSdk.Keypair,
  trustorPublicKey: string,
  server: StellarSdk.Horizon.Server,
  networkPassphrase: string
): Promise<void> {
  console.log(`🔐 Authorizing trustline for: ${trustorPublicKey}`);
  
  try {
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    const asset = createAsset(issuerKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.setTrustLineFlags({
          trustor: trustorPublicKey,
          asset: asset,
          flags: {
            authorized: true,
          },
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(issuerKeypair);
    const result = await server.submitTransaction(transaction);
    
    console.log('✅ Trustline authorized');
    console.log(`   Transaction: ${result.hash}`);
  } catch (error) {
    console.error('❌ Failed to authorize trustline:', error);
    throw error;
  }
}

/**
 * Issue tokens to a recipient
 */
async function issueTokens(
  issuerKeypair: StellarSdk.Keypair,
  recipientPublicKey: string,
  amount: string,
  server: StellarSdk.Horizon.Server,
  networkPassphrase: string
): Promise<string> {
  console.log(`💰 Issuing ${amount} ${ASSET_CODE} to: ${recipientPublicKey}`);
  
  try {
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    const asset = createAsset(issuerKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: recipientPublicKey,
          asset: asset,
          amount: amount,
        })
      )
      .setTimeout(180)
      .build();
    
    transaction.sign(issuerKeypair);
    const result = await server.submitTransaction(transaction);
    
    console.log('✅ Tokens issued successfully');
    console.log(`   Amount: ${amount} ${ASSET_CODE}`);
    console.log(`   Transaction: ${result.hash}`);
    
    return result.hash;
  } catch (error) {
    console.error('❌ Failed to issue tokens:', error);
    throw error;
  }
}

/**
 * Check if account has trustline for DEPOSIT_INR
 */
async function hasTrustline(
  accountPublicKey: string,
  issuerPublicKey: string,
  server: StellarSdk.Horizon.Server
): Promise<boolean> {
  try {
    const account = await server.loadAccount(accountPublicKey);
    const asset = createAsset(issuerPublicKey);
    
    const balance = account.balances.find(
      (b: any) => 
        b.asset_type !== 'native' &&
        b.asset_code === asset.getCode() &&
        b.asset_issuer === asset.getIssuer()
    );
    
    return !!balance;
  } catch (error) {
    return false;
  }
}

/**
 * Interactive CLI for token issuance
 */
async function main() {
  console.log('🚀 DEPOSIT_INR Token Issuance\n');
  
  try {
    // Load credentials
    const credentials = loadIssuerCredentials();
    console.log('✅ Loaded issuer credentials');
    console.log(`   Issuer: ${credentials.publicKey}`);
    console.log(`   Network: ${credentials.network}\n`);
    
    const issuerKeypair = StellarSdk.Keypair.fromSecret(credentials.secretKey);
    const networkPassphrase = credentials.network === 'TESTNET'
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC;
    
    const horizonUrl = credentials.network === 'TESTNET'
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';
    
    const server = new StellarSdk.Horizon.Server(horizonUrl);
    
    // Example: Issue tokens to a recipient
    // In production, you would get these from command line args or API
    const EXAMPLE_RECIPIENT = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Replace with actual address
    const EXAMPLE_AMOUNT = '10000'; // 10,000 DEPOSIT_INR
    
    console.log('📋 Example Usage:\n');
    console.log('To issue tokens, you need to:');
    console.log('1. Ensure recipient has a trustline to DEPOSIT_INR');
    console.log('2. Authorize the trustline (if AUTH_REQUIRED is set)');
    console.log('3. Send payment from issuer to recipient\n');
    
    console.log('💡 For programmatic usage, import these functions:');
    console.log('   - authorizeTrustline(issuerKeypair, trustorPublicKey, server, networkPassphrase)');
    console.log('   - issueTokens(issuerKeypair, recipientPublicKey, amount, server, networkPassphrase)');
    console.log('   - hasTrustline(accountPublicKey, issuerPublicKey, server)\n');
    
    // Uncomment below to issue tokens (after setting EXAMPLE_RECIPIENT)
    /*
    if (EXAMPLE_RECIPIENT !== 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') {
      // Check trustline
      const trustlineExists = await hasTrustline(EXAMPLE_RECIPIENT, issuerKeypair.publicKey(), server);
      
      if (!trustlineExists) {
        console.log('⚠️  Recipient does not have a trustline. They need to add it first.');
        return;
      }
      
      // Authorize trustline
      await authorizeTrustline(issuerKeypair, EXAMPLE_RECIPIENT, server, networkPassphrase);
      console.log('');
      
      // Issue tokens
      await issueTokens(issuerKeypair, EXAMPLE_RECIPIENT, EXAMPLE_AMOUNT, server, networkPassphrase);
      console.log('');
      
      console.log('✅ Token issuance complete!');
    }
    */
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
export {
  loadIssuerCredentials,
  createAsset,
  authorizeTrustline,
  issueTokens,
  hasTrustline,
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
