/**
 * Deposit Controller
 * Handles deposit transaction flow from QR scanning to submission
 */

import { Request, Response } from 'express';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  getPropertyById,
  getEscrowWalletByPropertyId,
  getDatabase,
  generateId,
} from '../database/db.js';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK === 'PUBLIC'
  ? StellarSdk.Networks.PUBLIC
  : StellarSdk.Networks.TESTNET;

const ISSUER_PUBLIC_KEY = process.env.DEPOSIT_ISSUER_PUBLIC_KEY!;
const ASSET_CODE = process.env.DEPOSIT_ASSET_CODE || 'DEPOSIT_INR';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * POST /api/deposits/validate-qr
 * Parse and validate QR code payload
 */
export async function validateQR(req: Request, res: Response) {
  try {
    const { qr_payload } = req.body;

    if (!qr_payload) {
      return res.status(400).json({ error: 'QR payload is required' });
    }

    console.log(`🔍 Validating QR: ${qr_payload.substring(0, 50)}...`);

    // Parse QR payload
    // Format: stellar:ESCROW_ADDRESS?asset=DEPOSIT_INR&amount=X&lease=Y&property=Z&issuer=I
    if (!qr_payload.startsWith('stellar:')) {
      return res.status(400).json({ error: 'Invalid QR format - must start with stellar:' });
    }

    const [addressPart, queryPart] = qr_payload.substring(8).split('?');
    const escrowAddress = addressPart;

    if (!escrowAddress || !queryPart) {
      return res.status(400).json({ error: 'Invalid QR format - missing parameters' });
    }

    // Parse query parameters
    const params = new URLSearchParams(queryPart);
    const asset = params.get('asset');
    const amount = params.get('amount');
    const leaseDuration = params.get('lease');
    const propertyId = params.get('property');
    const issuer = params.get('issuer');

    // Validate all required parameters
    if (!asset || !amount || !leaseDuration || !propertyId || !issuer) {
      return res.status(400).json({
        error: 'Missing required QR parameters',
        required: ['asset', 'amount', 'lease', 'property', 'issuer'],
      });
    }

    // Validate asset matches
    if (asset !== ASSET_CODE) {
      return res.status(400).json({
        error: `Invalid asset code. Expected ${ASSET_CODE}, got ${asset}`,
      });
    }

    // Validate issuer matches
    if (issuer !== ISSUER_PUBLIC_KEY) {
      return res.status(400).json({
        error: 'Invalid issuer public key',
      });
    }

    // Validate Stellar address
    if (!escrowAddress.startsWith('G') || escrowAddress.length !== 56) {
      return res.status(400).json({ error: 'Invalid escrow address format' });
    }

    // Get property details
    const property = await getPropertyById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Verify escrow address matches property
    const escrow = await getEscrowWalletByPropertyId(propertyId);
    if (!escrow || escrow.public_key !== escrowAddress) {
      return res.status(400).json({ error: 'Escrow address does not match property' });
    }

    // Verify amount matches property deposit
    if (parseFloat(amount) !== property.deposit_amount) {
      return res.status(400).json({
        error: 'Amount mismatch',
        expected: property.deposit_amount,
        received: parseFloat(amount),
      });
    }

    console.log(`✅ QR validated for property: ${property.property_name}`);

    res.json({
      success: true,
      valid: true,
      deposit_details: {
        property_id: property.id,
        property_name: property.property_name,
        landlord_wallet: property.landlord_wallet,
        escrow_address: escrowAddress,
        deposit_amount: parseFloat(amount),
        lease_duration_months: parseInt(leaseDuration),
        asset_code: asset,
        issuer: issuer,
      },
    });
  } catch (error: any) {
    console.error('❌ Error validating QR:', error);
    res.status(500).json({
      error: 'Failed to validate QR code',
      message: error.message,
    });
  }
}

/**
 * POST /api/deposits/build-transaction
 * Build unsigned Stellar transaction for deposit
 */
export async function buildTransaction(req: Request, res: Response) {
  try {
    const { tenant_wallet, property_id, amount } = req.body;

    // Validation
    if (!tenant_wallet || !property_id || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tenant_wallet', 'property_id', 'amount'],
      });
    }

    if (!tenant_wallet.startsWith('G') || tenant_wallet.length !== 56) {
      return res.status(400).json({ error: 'Invalid tenant wallet address' });
    }

    console.log(`🔨 Building transaction for tenant: ${tenant_wallet}`);

    // Get property and escrow
    const property = await getPropertyById(property_id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const escrow = await getEscrowWalletByPropertyId(property_id);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow wallet not found' });
    }

    // Verify amount matches
    if (parseFloat(amount) !== property.deposit_amount) {
      return res.status(400).json({
        error: 'Amount does not match property deposit',
        expected: property.deposit_amount,
      });
    }

    // Load tenant account
    const tenantAccount = await server.loadAccount(tenant_wallet);

    // Create DEPOSIT_INR asset
    const depositAsset = new StellarSdk.Asset(ASSET_CODE, ISSUER_PUBLIC_KEY);

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(tenantAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: escrow.public_key,
          asset: depositAsset,
          amount: amount.toString(),
        })
      )
      .addMemo(StellarSdk.Memo.text(`Deposit:${property_id.substring(0, 20)}`))
      .setTimeout(300) // 5 minutes
      .build();

    // Get unsigned XDR
    const xdr = transaction.toXDR();

    console.log(`✅ Transaction built for ${amount} ${ASSET_CODE}`);

    res.json({
      success: true,
      transaction: {
        xdr,
        network: process.env.STELLAR_NETWORK || 'TESTNET',
        details: {
          from: tenant_wallet,
          to: escrow.public_key,
          asset: ASSET_CODE,
          amount: parseFloat(amount),
          memo: `Deposit:${property_id.substring(0, 20)}`,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error building transaction:', error);
    res.status(500).json({
      error: 'Failed to build transaction',
      message: error.message,
    });
  }
}

/**
 * POST /api/deposits/submit
 * Submit signed transaction and create lease record
 */
export async function submitDeposit(req: Request, res: Response) {
  try {
    const { signed_xdr, lease_details } = req.body;

    // Validation
    if (!signed_xdr) {
      return res.status(400).json({ error: 'Signed XDR is required' });
    }

    if (!lease_details || !lease_details.property_id || !lease_details.tenant_wallet) {
      return res.status(400).json({
        error: 'Lease details required',
        required: ['property_id', 'tenant_wallet', 'deposit_amount'],
      });
    }

    console.log(`📤 Submitting deposit transaction...`);

    // Parse transaction
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signed_xdr,
      NETWORK_PASSPHRASE
    ) as StellarSdk.Transaction;

    // Submit to Stellar
    const result = await server.submitTransaction(transaction);

    console.log(`✅ Transaction submitted: ${result.hash}`);

    // Create lease record
    const db = await getDatabase();
    const leaseId = generateId();
    const now = new Date().toISOString();
    
    // Calculate lease end date
    const property = await getPropertyById(lease_details.property_id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const leaseStartDate = lease_details.lease_start_date || now;
    const leaseEndDate = new Date(leaseStartDate);
    leaseEndDate.setMonth(leaseEndDate.getMonth() + property.lease_duration_months);

    await db.run(
      `INSERT INTO leases (
        id, 
        property_id, 
        tenant_wallet, 
        deposit_amount, 
        deposit_tx_hash,
        lease_start_date, 
        lease_end_date, 
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leaseId,
        lease_details.property_id,
        lease_details.tenant_wallet,
        lease_details.deposit_amount || property.deposit_amount,
        result.hash,
        leaseStartDate,
        leaseEndDate.toISOString(),
        'active',
        now,
      ]
    );

    // Create deposit transaction record
    const txId = generateId();
    await db.run(
      `INSERT INTO deposit_transactions (
        id, 
        lease_id, 
        tx_hash, 
        amount, 
        type, 
        status,
        from_address,
        to_address,
        created_at,
        confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txId,
        leaseId,
        result.hash,
        lease_details.deposit_amount || property.deposit_amount,
        'deposit',
        'confirmed',
        lease_details.tenant_wallet,
        (await getEscrowWalletByPropertyId(lease_details.property_id))?.public_key,
        now,
        now,
      ]
    );

    console.log(`✅ Lease created: ${leaseId}`);

    // Send deposit confirmation notification
    try {
      const { sendDepositConfirmation } = await import('../services/notification.service.js');
      const tenantPhone = process.env.TEST_TENANT_PHONE;
      if (tenantPhone) {
        await sendDepositConfirmation(
          tenantPhone,
          lease_details.deposit_amount || property.deposit_amount,
          property.property_name,
          leaseId
        );
        console.log('📱 Deposit confirmation sent');
      }
    } catch (notifError: any) {
      console.warn('⚠️  Notification failed:', notifError.message);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      transaction: {
        hash: result.hash,
        ledger: result.ledger,
      },
      lease: {
        id: leaseId,
        property_id: lease_details.property_id,
        tenant_wallet: lease_details.tenant_wallet,
        deposit_amount: lease_details.deposit_amount || property.deposit_amount,
        lease_start_date: leaseStartDate,
        lease_end_date: leaseEndDate.toISOString(),
        status: 'active',
      },
    });
  } catch (error: any) {
    console.error('❌ Error submitting deposit:', error);
    
    // Check if it's a Stellar error
    if (error.response?.data) {
      return res.status(400).json({
        error: 'Transaction submission failed',
        stellar_error: error.response.data,
      });
    }

    res.status(500).json({
      error: 'Failed to submit deposit',
      message: error.message,
    });
  }
}

/**
 * GET /api/deposits/status/:leaseId
 * Get deposit status and lease details
 */
export async function getDepositStatus(req: Request, res: Response) {
  try {
    const { leaseId } = req.params;

    console.log(`📊 Fetching deposit status for lease: ${leaseId}`);

    const db = await getDatabase();

    // Get lease details
    const lease: any = await db.get(
      `SELECT * FROM leases WHERE id = ?`,
      [leaseId]
    );

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    // Get property details
    const property = await getPropertyById(lease.property_id);

    // Get all transactions for this lease
    const transactions: any[] = await db.all(
      `SELECT * FROM deposit_transactions 
       WHERE lease_id = ? 
       ORDER BY created_at DESC`,
      [leaseId]
    );

    // Calculate timeline
    const now = new Date();
    const startDate = new Date(lease.lease_start_date);
    const endDate = new Date(lease.lease_end_date);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      lease: {
        id: lease.id,
        property_id: lease.property_id,
        property_name: property?.property_name,
        tenant_wallet: lease.tenant_wallet,
        landlord_wallet: property?.landlord_wallet,
        deposit_amount: lease.deposit_amount,
        deposit_tx_hash: lease.deposit_tx_hash,
        lease_start_date: lease.lease_start_date,
        lease_end_date: lease.lease_end_date,
        status: lease.status,
        created_at: lease.created_at,
      },
      timeline: {
        progress_percent: Math.round(progress),
        days_remaining: daysRemaining,
        is_expired: now > endDate,
        is_active: lease.status === 'active',
      },
      transactions: transactions.map(tx => ({
        id: tx.id,
        tx_hash: tx.tx_hash,
        amount: tx.amount,
        type: tx.type,
        status: tx.status,
        from_address: tx.from_address,
        to_address: tx.to_address,
        created_at: tx.created_at,
        confirmed_at: tx.confirmed_at,
      })),
      stats: {
        total_transactions: transactions.length,
        total_deposited: transactions
          .filter((tx: any) => tx.type === 'deposit' && tx.status === 'confirmed')
          .reduce((sum: number, tx: any) => sum + tx.amount, 0),
        total_released: transactions
          .filter((tx: any) => tx.type === 'release' && tx.status === 'confirmed')
          .reduce((sum: number, tx: any) => sum + tx.amount, 0),
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching deposit status:', error);
    res.status(500).json({
      error: 'Failed to fetch deposit status',
      message: error.message,
    });
  }
}
