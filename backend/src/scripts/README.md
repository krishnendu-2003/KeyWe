# DEPOSIT_INR Token Issuer Scripts

This directory contains scripts for managing the DEPOSIT_INR token issuer account on Stellar.

## Scripts

### 1. `create-deposit-issuer.ts`

Creates a new Stellar issuer account for DEPOSIT_INR tokens.

**What it does:**

- Generates a new Stellar keypair
- Funds the account on testnet using Friendbot
- Configures AUTH_REQUIRED and AUTH_REVOCABLE flags
- Saves credentials securely
- Updates .env file

**Usage:**

```bash
npm run create-issuer
```

**Output:**

- `backend/credentials/issuer-credentials.json` - Issuer keypair (KEEP SECURE!)
- `backend/.env` - Environment variables with public key

### 2. `issue-deposit-tokens.ts`

Issues DEPOSIT_INR tokens from the issuer account.

**What it does:**

- Loads issuer credentials
- Authorizes trustlines for recipients
- Issues tokens via payment operation

**Usage:**

```bash
npm run issue-tokens
```

**Functions exported:**

- `authorizeTrustline()` - Authorize an account to hold DEPOSIT_INR
- `issueTokens()` - Send DEPOSIT_INR tokens to an account
- `hasTrustline()` - Check if account has trustline

## Security

⚠️ **CRITICAL SECURITY NOTES:**

1. **Never commit credentials to git**
   - `credentials/` directory is in .gitignore
   - Never share issuer secret key
   - Back up secret key securely offline

2. **Production deployment**
   - Use environment variables for secrets
   - Consider hardware wallet for mainnet issuer
   - Implement multi-signature for large operations

3. **Access control**
   - Limit who can run these scripts
   - Audit all token issuance operations
   - Monitor issuer account activity

## Token Details

**Asset Code:** DEPOSIT_INR  
**Asset Type:** Fiat-backed security deposit token  
**Value:** 1 token = ₹1  
**Transferable:** No (restricted by AUTH_REQUIRED)  
**Redeemable:** Yes (on lease completion)

## Workflow

### Initial Setup

```bash
# 1. Create issuer account
npm run create-issuer

# 2. Verify account on Stellar Expert
# Visit: https://stellar.expert/explorer/testnet/account/[PUBLIC_KEY]

# 3. Back up credentials
# Copy backend/credentials/issuer-credentials.json to secure location
```

### Issuing Tokens

```bash
# 1. Recipient creates trustline to DEPOSIT_INR
# (Done in tenant app when scanning deposit QR)

# 2. Issuer authorizes trustline
# (Automated in deposit flow)

# 3. Issuer sends tokens to recipient
# (Automated when tenant confirms deposit)
```

## Integration with Backend

These scripts are used by the backend API:

- **Deposit Flow:** When tenant scans QR and confirms deposit
  1. Backend creates escrow wallet
  2. Backend authorizes escrow trustline
  3. Backend issues tokens to escrow
  4. Tokens locked until lease end

- **Release Flow:** When lease expires or landlord approves
  1. Backend transfers tokens from escrow to tenant
  2. If deduction, split payment to tenant + landlord
  3. Update lease status

## Environment Variables

After running `create-issuer`, your `.env` will contain:

```env
DEPOSIT_ISSUER_PUBLIC_KEY=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
DEPOSIT_ASSET_CODE=DEPOSIT_INR
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

## Troubleshooting

**Error: "Issuer credentials not found"**

- Run `npm run create-issuer` first

**Error: "Friendbot request failed"**

- Check internet connection
- Testnet might be down, try again later

**Error: "Account not found"**

- Wait a few seconds after Friendbot funding
- Check account exists on Stellar Expert

**Error: "Transaction failed"**

- Check account has sufficient XLM balance
- Verify network is correct (testnet vs mainnet)

## Next Steps

After creating the issuer:

1. ✅ Create escrow wallet service
2. ✅ Build deposit transaction API
3. ✅ Implement release workflow
4. ✅ Add to landlord dashboard
5. ✅ Integrate with mobile app

## References

- [Stellar Asset Documentation](https://developers.stellar.org/docs/issuing-assets)
- [Authorization Flags](https://developers.stellar.org/docs/issuing-assets/control-asset-access)
- [Stellar SDK](https://stellar.github.io/js-stellar-sdk/)
