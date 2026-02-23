/**
 * Release Controller
 * Handles deposit release workflow from approval to execution
 */

import { Request, Response } from 'express';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  getDatabase,
  generateId,
  getPropertyById,
  getEscrowWalletByPropertyId,
} from '../database/db.js';
import { releaseDeposit } from '../services/escrow.service.js';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK === 'PUBLIC'
  ? StellarSdk.Networks.PUBLIC
  : StellarSdk.Networks.TESTNET;

const ISSUER_PUBLIC_KEY = process.env.DEPOSIT_ISSUER_PUBLIC_KEY!;
const ASSET_CODE = process.env.DEPOSIT_ASSET_CODE || 'DEPOSIT_INR';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * POST /api/release/approve
 * Landlord approves deposit release with optional deductions
 */
export async function approveRelease(req: Request, res: Response) {
  try {
    const { lease_id, deduction_amount, reason } = req.body;

    // Validation
    if (!lease_id) {
      return res.status(400).json({ error: 'Lease ID is required' });
    }

    const deduction = parseFloat(deduction_amount || '0');
    if (deduction < 0) {
      return res.status(400).json({ error: 'Deduction amount cannot be negative' });
    }

    console.log(`📝 Approving release for lease: ${lease_id}`);

    const db = await getDatabase();

    // Get lease details
    const lease: any = await db.get('SELECT * FROM leases WHERE id = ?', [lease_id]);
    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    // Check if lease is active
    if (lease.status !== 'active') {
      return res.status(400).json({
        error: 'Lease is not active',
        current_status: lease.status,
      });
    }

    // Get property details
    const property = await getPropertyById(lease.property_id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Get escrow wallet
    const escrow = await getEscrowWalletByPropertyId(lease.property_id);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow wallet not found' });
    }

    // Calculate refund amount
    const totalDeposit = lease.deposit_amount;
    const refundAmount = totalDeposit - deduction;

    if (refundAmount < 0) {
      return res.status(400).json({
        error: 'Deduction exceeds deposit amount',
        deposit: totalDeposit,
        deduction: deduction,
      });
    }

    // Decrypt escrow secret key and build transactions
    const escrowService = await import('../services/escrow.service.js');
    
    // Manually decrypt the secret key
    const crypto = await import('crypto');
    const ENCRYPTION_KEY = process.env.ESCROW_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    function decryptSecretKey(encryptedKey: string): string {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const parts = encryptedKey.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    
    const secretKey = decryptSecretKey(escrow.secret_key_encrypted);
    const escrowKeypair = StellarSdk.Keypair.fromSecret(secretKey);

    // Load escrow account
    const account = await server.loadAccount(escrowKeypair.publicKey());

    // Create DEPOSIT_INR asset
    const depositAsset = new StellarSdk.Asset(ASSET_CODE, ISSUER_PUBLIC_KEY);

    // Build transaction with operations
    const txBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    // Add refund operation to tenant
    if (refundAmount > 0) {
      txBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: lease.tenant_wallet,
          asset: depositAsset,
          amount: refundAmount.toString(),
        })
      );
    }

    // Add deduction operation to landlord
    if (deduction > 0) {
      txBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: property.landlord_wallet,
          asset: depositAsset,
          amount: deduction.toString(),
        })
      );
    }

    // Add memo
    const memo = reason
      ? `Release:${reason.substring(0, 20)}`
      : `Release:${lease_id.substring(0, 20)}`;
    txBuilder.addMemo(StellarSdk.Memo.text(memo));

    const transaction = txBuilder.setTimeout(300).build();

    // Sign with escrow keypair
    transaction.sign(escrowKeypair);

    // Get signed XDR
    const xdr = transaction.toXDR();

    // Store approval in database
    const approvalId = generateId();
    await db.run(
      `INSERT INTO release_approvals (
        id, lease_id, deduction_amount, refund_amount, reason, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [approvalId, lease_id, deduction, refundAmount, reason || null, 'pending', new Date().toISOString()]
    );

    console.log(`✅ Release approved: Refund ₹${refundAmount}, Deduction ₹${deduction}`);

    res.json({
      success: true,
      approval: {
        id: approvalId,
        lease_id,
        total_deposit: totalDeposit,
        deduction_amount: deduction,
        refund_amount: refundAmount,
        reason: reason || null,
      },
      transaction: {
        xdr,
        network: process.env.STELLAR_NETWORK || 'TESTNET',
        details: {
          operations: [
            refundAmount > 0 && {
              type: 'payment',
              to: lease.tenant_wallet,
              amount: refundAmount,
              asset: ASSET_CODE,
              description: 'Refund to tenant',
            },
            deduction > 0 && {
              type: 'payment',
              to: property.landlord_wallet,
              amount: deduction,
              asset: ASSET_CODE,
              description: 'Deduction to landlord',
            },
          ].filter(Boolean),
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error approving release:', error);
    res.status(500).json({
      error: 'Failed to approve release',
      message: error.message,
    });
  }
}

/**
 * POST /api/release/execute
 * Execute approved release transaction
 */
export async function executeRelease(req: Request, res: Response) {
  try {
    const { signed_xdr, lease_id } = req.body;

    if (!signed_xdr || !lease_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['signed_xdr', 'lease_id'],
      });
    }

    console.log(`🚀 Executing release for lease: ${lease_id}`);

    const db = await getDatabase();

    // Get lease
    const lease: any = await db.get('SELECT * FROM leases WHERE id = ?', [lease_id]);
    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    // Parse and submit transaction
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signed_xdr,
      NETWORK_PASSPHRASE
    ) as StellarSdk.Transaction;

    const result = await server.submitTransaction(transaction);

    console.log(`✅ Release transaction submitted: ${result.hash}`);

    // Update lease status
    await db.run(
      'UPDATE leases SET status = ?, updated_at = ? WHERE id = ?',
      ['completed', new Date().toISOString(), lease_id]
    );

    // Get approval record
    const approval: any = await db.get(
      'SELECT * FROM release_approvals WHERE lease_id = ? ORDER BY created_at DESC LIMIT 1',
      [lease_id]
    );

    // Create transaction records
    const now = new Date().toISOString();

    // Refund transaction
    if (approval && approval.refund_amount > 0) {
      const refundTxId = generateId();
      await db.run(
        `INSERT INTO deposit_transactions (
          id, lease_id, tx_hash, amount, type, status,
          from_address, to_address, created_at, confirmed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          refundTxId,
          lease_id,
          result.hash,
          approval.refund_amount,
          'refund',
          'confirmed',
          (await getEscrowWalletByPropertyId(lease.property_id))?.public_key,
          lease.tenant_wallet,
          now,
          now,
        ]
      );
    }

    // Deduction transaction
    if (approval && approval.deduction_amount > 0) {
      const property = await getPropertyById(lease.property_id);
      const deductionTxId = generateId();
      await db.run(
        `INSERT INTO deposit_transactions (
          id, lease_id, tx_hash, amount, type, status,
          from_address, to_address, created_at, confirmed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deductionTxId,
          lease_id,
          result.hash,
          approval.deduction_amount,
          'deduction',
          'confirmed',
          (await getEscrowWalletByPropertyId(lease.property_id))?.public_key,
          property?.landlord_wallet,
          now,
          now,
        ]
      );
    }

    // Update approval status
    if (approval) {
      await db.run(
        'UPDATE release_approvals SET status = ?, executed_at = ? WHERE id = ?',
        ['executed', now, approval.id]
      );
    }

    // Update escrow wallet status
    const escrow = await getEscrowWalletByPropertyId(lease.property_id);
    if (escrow) {
      await db.run(
        'UPDATE escrow_wallets SET status = ?, updated_at = ? WHERE id = ?',
        ['closed', now, escrow.id]
      );
    }

    // Send release notifications
    try {
      const { sendReleaseNotification, sendDeductionNotice } = await import('../services/notification.service.js');
      const tenantPhone = process.env.TEST_TENANT_PHONE;
      const property = await getPropertyById(lease.property_id);
      
      if (tenantPhone && property) {
        if (approval && approval.deduction_amount > 0) {
          // Send deduction notice
          await sendDeductionNotice(
            tenantPhone,
            approval.deduction_amount,
            approval.refund_amount,
            approval.reason || 'No reason provided',
            property.property_name,
            lease_id
          );
        } else if (approval) {
          // Send full refund notification
          await sendReleaseNotification(
            tenantPhone,
            approval.refund_amount,
            property.property_name,
            lease_id
          );
        }
        console.log('📱 Release notification sent');
      }
    } catch (notifError: any) {
      console.warn('⚠️  Notification failed:', notifError.message);
    }

    res.json({
      success: true,
      transaction: {
        hash: result.hash,
        ledger: result.ledger,
      },
      lease: {
        id: lease_id,
        status: 'completed',
        completed_at: now,
      },
      release_details: approval
        ? {
            refund_amount: approval.refund_amount,
            deduction_amount: approval.deduction_amount,
            reason: approval.reason,
          }
        : null,
    });
  } catch (error: any) {
    console.error('❌ Error executing release:', error);

    if (error.response?.data) {
      return res.status(400).json({
        error: 'Transaction submission failed',
        stellar_error: error.response.data,
      });
    }

    res.status(500).json({
      error: 'Failed to execute release',
      message: error.message,
    });
  }
}

/**
 * GET /api/release/timeline/:leaseId
 * Get lease timeline and release eligibility
 */
export async function getTimeline(req: Request, res: Response) {
  try {
    const { leaseId } = req.params;

    console.log(`📅 Fetching timeline for lease: ${leaseId}`);

    const db = await getDatabase();

    const lease: any = await db.get('SELECT * FROM leases WHERE id = ?', [leaseId]);
    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const now = new Date();
    const startDate = new Date(lease.lease_start_date);
    const endDate = new Date(lease.lease_end_date);

    // Calculate timeline metrics
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const remaining = endDate.getTime() - now.getTime();

    const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const daysRemaining = Math.ceil(remaining / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));

    const isExpired = now > endDate;
    const isReleaseDue = daysRemaining <= 7; // Release eligible 7 days before end
    const canRelease = lease.status === 'active' && (isExpired || isReleaseDue);

    res.json({
      success: true,
      lease: {
        id: lease.id,
        status: lease.status,
        start_date: lease.lease_start_date,
        end_date: lease.lease_end_date,
        deposit_amount: lease.deposit_amount,
      },
      timeline: {
        progress_percent: Math.round(progressPercent),
        days_elapsed: daysElapsed,
        days_remaining: daysRemaining,
        total_days: Math.ceil(totalDuration / (1000 * 60 * 60 * 24)),
        is_expired: isExpired,
        is_release_due: isReleaseDue,
        can_release: canRelease,
      },
      release_window: {
        opens_at: new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        closes_at: endDate.toISOString(),
        is_open: isReleaseDue,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch timeline',
      message: error.message,
    });
  }
}

/**
 * POST /api/release/auto-trigger
 * Cron job to check and trigger releases for expired leases
 */
export async function autoTrigger(req: Request, res: Response) {
  try {
    console.log('🤖 Running auto-trigger for expired leases...');

    const db = await getDatabase();
    const now = new Date().toISOString();

    // Find all active leases that have expired
    const expiredLeases: any[] = await db.all(
      `SELECT * FROM leases 
       WHERE status = 'active' 
       AND lease_end_date <= ?
       ORDER BY lease_end_date ASC`,
      [now]
    );

    console.log(`Found ${expiredLeases.length} expired leases`);

    const results = [];

    for (const lease of expiredLeases) {
      try {
        // Check if already has pending approval
        const existingApproval: any = await db.get(
          'SELECT * FROM release_approvals WHERE lease_id = ? AND status = ?',
          [lease.id, 'pending']
        );

        if (existingApproval) {
          console.log(`⏭️  Lease ${lease.id} already has pending approval`);
          results.push({
            lease_id: lease.id,
            status: 'skipped',
            reason: 'Pending approval exists',
          });
          continue;
        }

        // Auto-approve with zero deduction (full refund)
        const approvalId = generateId();
        await db.run(
          `INSERT INTO release_approvals (
            id, lease_id, deduction_amount, refund_amount, reason, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            approvalId,
            lease.id,
            0,
            lease.deposit_amount,
            'Auto-triggered: Lease expired',
            'pending',
            now,
          ]
        );

        // Update lease to pending release
        await db.run(
          'UPDATE leases SET status = ?, updated_at = ? WHERE id = ?',
          ['pending_release', now, lease.id]
        );

        console.log(`✅ Auto-triggered release for lease: ${lease.id}`);

        results.push({
          lease_id: lease.id,
          status: 'triggered',
          deposit_amount: lease.deposit_amount,
          refund_amount: lease.deposit_amount,
          deduction_amount: 0,
        });
      } catch (error: any) {
        console.error(`❌ Failed to trigger lease ${lease.id}:`, error.message);
        results.push({
          lease_id: lease.id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const triggered = results.filter(r => r.status === 'triggered').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    res.json({
      success: true,
      summary: {
        total_checked: expiredLeases.length,
        triggered,
        failed,
        skipped,
      },
      results,
    });
  } catch (error: any) {
    console.error('❌ Error in auto-trigger:', error);
    res.status(500).json({
      error: 'Failed to run auto-trigger',
      message: error.message,
    });
  }
}
