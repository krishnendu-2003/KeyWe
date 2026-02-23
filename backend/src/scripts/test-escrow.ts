/**
 * Test Script for Escrow Service
 * 
 * Run: npx tsx src/scripts/test-escrow.ts
 */

import {
  createEscrowWallet,
  fundEscrowWallet,
  addDepositTrustline,
  getEscrowBalance,
  getEscrowWalletForProperty,
} from '../services/escrow.service.js';
import {
  initDatabase,
  createPropertyRecord,
  updatePropertyEscrowWallet,
} from '../database/db.js';

async function main() {
  console.log('🧪 Testing Escrow Service\n');

  try {
    // Initialize database
    await initDatabase();
    console.log('');

    // Step 1: Create a test property
    console.log('📝 Step 1: Creating test property...');
    const property = await createPropertyRecord(
      'GBEXAMPLELANDLORDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'Test Apartment 101',
      20000, // ₹20,000 deposit
      12 // 12 months lease
    );
    console.log(`✅ Property created: ${property.id}`);
    console.log(`   Name: ${property.property_name}`);
    console.log(`   Deposit: ₹${property.deposit_amount}`);
    console.log('');

    // Step 2: Create escrow wallet
    console.log('📝 Step 2: Creating escrow wallet...');
    const { escrowWallet, publicKey } = await createEscrowWallet(property.id);
    console.log(`✅ Escrow wallet created: ${publicKey}`);
    console.log(`   ID: ${escrowWallet.id}`);
    console.log('');

    // Step 3: Link escrow to property
    console.log('📝 Step 3: Linking escrow to property...');
    await updatePropertyEscrowWallet(property.id, escrowWallet.id);
    console.log(`✅ Escrow linked to property`);
    console.log('');

    // Step 4: Fund escrow wallet
    console.log('📝 Step 4: Funding escrow wallet...');
    const fundTxHash = await fundEscrowWallet(escrowWallet.id);
    console.log(`✅ Escrow funded: ${fundTxHash}`);
    console.log('');

    // Wait for funding to settle
    console.log('⏳ Waiting 5 seconds for funding to settle...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // Step 5: Add DEPOSIT_INR trustline
    console.log('📝 Step 5: Adding DEPOSIT_INR trustline...');
    const trustlineTxHash = await addDepositTrustline(escrowWallet.id);
    console.log(`✅ Trustline added: ${trustlineTxHash}`);
    console.log('');

    // Wait for trustline to settle
    console.log('⏳ Waiting 5 seconds for trustline to settle...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // Step 6: Check escrow balance
    console.log('📝 Step 6: Checking escrow balance...');
    const balance = await getEscrowBalance(escrowWallet.id);
    console.log(`✅ Escrow balance:`);
    console.log(`   XLM: ${balance.xlm}`);
    console.log(`   DEPOSIT_INR: ${balance.depositInr}`);
    console.log('');

    // Step 7: Retrieve escrow by property ID
    console.log('📝 Step 7: Retrieving escrow by property ID...');
    const retrievedEscrow = await getEscrowWalletForProperty(property.id);
    if (retrievedEscrow) {
      console.log(`✅ Escrow retrieved: ${retrievedEscrow.public_key}`);
      console.log(`   Status: ${retrievedEscrow.status}`);
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All Tests Passed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Test Summary:');
    console.log(`   Property ID: ${property.id}`);
    console.log(`   Escrow Wallet: ${publicKey}`);
    console.log(`   Funding Tx: ${fundTxHash}`);
    console.log(`   Trustline Tx: ${trustlineTxHash}`);
    console.log('');
    console.log('🔗 View on Stellar Expert:');
    console.log(`   https://stellar.expert/explorer/testnet/account/${publicKey}`);
    console.log('');
    console.log('⚠️  Next Steps:');
    console.log('   1. Issuer must authorize the escrow trustline');
    console.log('   2. Issue DEPOSIT_INR tokens to tenant');
    console.log('   3. Tenant sends tokens to escrow');
    console.log('   4. Test release flow (full/partial refund)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
