/**
 * Escrow Wallet Management Service
 * 
 * Handles creation, funding, and management of escrow wallets for security deposits.
 * Integrates with Stellar blockchain for token operations.
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { Keypair } from '@stellar/stellar-sdk';
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import {
  createEscrowWalletRecord,
  getEscrowWalletByPropertyId,
  getEscrowWalletById,
  updateEscrowWalletStatus,
  type EscrowWallet,
} from '../database/db.js';

// Configuration
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK === 'PUBLIC'
  ? StellarSdk.Networks.PUBLIC
  : StellarSdk.Networks.TESTNET;

const ISSUER_PUBLIC_KEY = process.env.DEPOSIT_ISSUER_PUBLIC_KEY!;
const ASSET_CODE = process.env.DEPOSIT_ASSET_CODE || 'DEPOSIT_INR';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Encryption/Decryption utilities for secret keys
 */
const ENCRYPTION_KEY = process.env.ESCROW_ENCRYPTION_KEY || 'default-key-change-in-production';

function encryptSecretKey(secretKey: string): string {
  // Use modern crypto API
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(secretKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV to encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

function decryptSecretKey(encryptedKey: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  // Split IV and encrypted data
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Create DEPOSIT_INR asset object
 */
function createDepositAsset(): StellarSdk.Asset {
  return new StellarSdk.Asset(ASSET_CODE, ISSUER_PUBLIC_KEY);
}

/**
 * Create a new escrow wallet
 * Generates a Stellar keypair and stores it securely
 */
export async function createEscrowWallet(propertyId: string): Promise<{
  escrowWallet: EscrowWallet;
  publicKey: string;
}> {
  // Generate new Stellar keypair
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();

  // Encrypt secret key before storing
  const encryptedSecretKey = encryptSecretKey(secretKey);

  // Store in database
  const escrowWallet = await createEscrowWalletRecord(
    propertyId,
    publicKey,
    encryptedSecretKey
  );

  console.log(`✅ Created escrow wallet: ${publicKey}`);

  return {
    escrowWallet,
    publicKey,
  };
}

/**
 * Fund escrow wallet with XLM (for transaction fees)
 * Uses Friendbot on testnet, requires manual funding on mainnet
 */
export async function fundEscrowWallet(
  escrowWalletId: string,
  fundingAmount: string = '5' // 5 XLM default
): Promise<string> {
  const escrowWallet = await getEscrowWalletById(escrowWalletId);
  if (!escrowWallet) {
    throw new Error('Escrow wallet not found');
  }

  const publicKey = escrowWallet.public_key;

  // On testnet, use Friendbot
  if (NETWORK_PASSPHRASE === StellarSdk.Networks.TESTNET) {
    console.log(`💰 Funding escrow wallet via Friendbot: ${publicKey}`);
    
    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
      );
      
      if (!response.ok) {
        throw new Error(`Friendbot request failed: ${response.statusText}`);
      }
      
      const responseJSON: any = await response.json();
      console.log(`✅ Escrow wallet funded: ${responseJSON.hash}`);
      return responseJSON.hash;
    } catch (error) {
      console.error('❌ Failed to fund escrow wallet:', error);
      throw error;
    }
  } else {
    // On mainnet, return instruction for manual funding
    throw new Error(
      `Manual funding required. Send ${fundingAmount} XLM to: ${publicKey}`
    );
  }
}

/**
 * Add DEPOSIT_INR trustline to escrow wallet
 */
export async function addDepositTrustline(
  escrowWalletId: string
): Promise<string> {
  const escrowWallet = await getEscrowWalletById(escrowWalletId);
  if (!escrowWallet) {
    throw new Error('Escrow wallet not found');
  }

  // Decrypt secret key
  const secretKey = decryptSecretKey(escrowWallet.secret_key_encrypted);
  const escrowKeypair = Keypair.fromSecret(secretKey);

  console.log(`🔗 Adding DEPOSIT_INR trustline to: ${escrowWallet.public_key}`);

  try {
    // Load escrow account
    const account = await server.loadAccount(escrowKeypair.publicKey());

    // Build trustline transaction
    const asset = createDepositAsset();
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: asset,
          limit: '1000000000', // High limit for deposits
        })
      )
      .setTimeout(180)
      .build();

    // Sign and submit
    transaction.sign(escrowKeypair);
    const result = await server.submitTransaction(transaction);

    console.log(`✅ Trustline added: ${result.hash}`);
    return result.hash;
  } catch (error) {
    console.error('❌ Failed to add trustline:', error);
    throw error;
  }
}

/**
 * Lock deposit tokens in escrow
 * Transfers DEPOSIT_INR from tenant to escrow wallet
 * 
 * Note: This requires the issuer to first authorize the escrow trustline
 * and issue tokens to the tenant, then tenant sends to escrow
 */
export async function lockDeposit(
  escrowWalletId: string,
  tenantPublicKey: string,
  amount: string
): Promise<{
  txHash: string;
  escrowPublicKey: string;
}> {
  const escrowWallet = await getEscrowWalletById(escrowWalletId);
  if (!escrowWallet) {
    throw new Error('Escrow wallet not found');
  }

  console.log(`🔒 Locking ${amount} DEPOSIT_INR in escrow from: ${tenantPublicKey}`);

  // Note: In production, this would be called after tenant signs the transaction
  // For now, we return the escrow address for the tenant to send to

  return {
    txHash: '', // Will be filled when tenant submits transaction
    escrowPublicKey: escrowWallet.public_key,
  };
}

/**
 * Release deposit tokens from escrow
 * Supports full refund or partial refund with deduction
 */
export async function releaseDeposit(
  escrowWalletId: string,
  tenantPublicKey: string,
  refundAmount: string,
  landlordPublicKey?: string,
  deductionAmount?: string
): Promise<{
  refundTxHash?: string;
  deductionTxHash?: string;
}> {
  const escrowWallet = await getEscrowWalletById(escrowWalletId);
  if (!escrowWallet) {
    throw new Error('Escrow wallet not found');
  }

  // Decrypt secret key
  const secretKey = decryptSecretKey(escrowWallet.secret_key_encrypted);
  const escrowKeypair = Keypair.fromSecret(secretKey);

  console.log(`🔓 Releasing deposit from escrow: ${escrowWallet.public_key}`);

  const asset = createDepositAsset();
  const results: { refundTxHash?: string; deductionTxHash?: string } = {};

  try {
    // Load escrow account
    const account = await server.loadAccount(escrowKeypair.publicKey());

    // Build refund transaction to tenant
    if (parseFloat(refundAmount) > 0) {
      const refundTx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: tenantPublicKey,
            asset: asset,
            amount: refundAmount,
          })
        )
        .setTimeout(180)
        .build();

      refundTx.sign(escrowKeypair);
      const refundResult = await server.submitTransaction(refundTx);
      results.refundTxHash = refundResult.hash;
      console.log(`✅ Refund sent to tenant: ${refundResult.hash}`);
    }

    // Build deduction transaction to landlord (if applicable)
    if (landlordPublicKey && deductionAmount && parseFloat(deductionAmount) > 0) {
      // Reload account for new sequence number
      const accountReloaded = await server.loadAccount(escrowKeypair.publicKey());

      const deductionTx = new StellarSdk.TransactionBuilder(accountReloaded, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: landlordPublicKey,
            asset: asset,
            amount: deductionAmount,
          })
        )
        .setTimeout(180)
        .build();

      deductionTx.sign(escrowKeypair);
      const deductionResult = await server.submitTransaction(deductionTx);
      results.deductionTxHash = deductionResult.hash;
      console.log(`✅ Deduction sent to landlord: ${deductionResult.hash}`);
    }

    // Update escrow wallet status
    await updateEscrowWalletStatus(escrowWalletId, 'closed');

    return results;
  } catch (error) {
    console.error('❌ Failed to release deposit:', error);
    throw error;
  }
}

/**
 * Get escrow wallet balance
 */
export async function getEscrowBalance(
  escrowWalletId: string
): Promise<{
  xlm: string;
  depositInr: string;
}> {
  const escrowWallet = await getEscrowWalletById(escrowWalletId);
  if (!escrowWallet) {
    throw new Error('Escrow wallet not found');
  }

  try {
    const account = await server.loadAccount(escrowWallet.public_key);
    const asset = createDepositAsset();

    let xlmBalance = '0';
    let depositInrBalance = '0';

    for (const balance of account.balances) {
      if (balance.asset_type === 'native') {
        xlmBalance = balance.balance;
      } else if (
        balance.asset_type !== 'liquidity_pool_shares' &&
        balance.asset_code === asset.getCode() &&
        balance.asset_issuer === asset.getIssuer()
      ) {
        depositInrBalance = balance.balance;
      }
    }

    return {
      xlm: xlmBalance,
      depositInr: depositInrBalance,
    };
  } catch (error) {
    console.error('❌ Failed to get escrow balance:', error);
    throw error;
  }
}

/**
 * Get escrow wallet by property ID
 */
export async function getEscrowWalletForProperty(
  propertyId: string
): Promise<EscrowWallet | null> {
  return await getEscrowWalletByPropertyId(propertyId);
}

/**
 * Multi-signature support (optional)
 * Add additional signers to escrow wallet for enhanced security
 */
export async function addEscrowSigner(
  escrowWalletId: string,
  signerPublicKey: string,
  weight: number = 1
): Promise<string> {
  const escrowWallet = await getEscrowWalletById(escrowWalletId);
  if (!escrowWallet) {
    throw new Error('Escrow wallet not found');
  }

  const secretKey = decryptSecretKey(escrowWallet.secret_key_encrypted);
  const escrowKeypair = Keypair.fromSecret(secretKey);

  console.log(`👥 Adding signer to escrow: ${signerPublicKey}`);

  try {
    const account = await server.loadAccount(escrowKeypair.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.setOptions({
          signer: {
            ed25519PublicKey: signerPublicKey,
            weight: weight,
          },
        })
      )
      .setTimeout(180)
      .build();

    transaction.sign(escrowKeypair);
    const result = await server.submitTransaction(transaction);

    console.log(`✅ Signer added: ${result.hash}`);
    return result.hash;
  } catch (error) {
    console.error('❌ Failed to add signer:', error);
    throw error;
  }
}

/**
 * Set escrow wallet thresholds for multi-sig
 */
export async function setEscrowThresholds(
  escrowWalletId: string,
  lowThreshold: number = 1,
  medThreshold: number = 2,
  highThreshold: number = 2
): Promise<string> {
  const escrowWallet = await getEscrowWalletById(escrowWalletId);
  if (!escrowWallet) {
    throw new Error('Escrow wallet not found');
  }

  const secretKey = decryptSecretKey(escrowWallet.secret_key_encrypted);
  const escrowKeypair = Keypair.fromSecret(secretKey);

  console.log(`⚙️  Setting escrow thresholds`);

  try {
    const account = await server.loadAccount(escrowKeypair.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.setOptions({
          lowThreshold,
          medThreshold,
          highThreshold,
        })
      )
      .setTimeout(180)
      .build();

    transaction.sign(escrowKeypair);
    const result = await server.submitTransaction(transaction);

    console.log(`✅ Thresholds set: ${result.hash}`);
    return result.hash;
  } catch (error) {
    console.error('❌ Failed to set thresholds:', error);
    throw error;
  }
}

// Export types
export type { EscrowWallet };
