# Quick Start Guide

Get KeyWe up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Step 2: Setup Environment

### Backend
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
SECRET_KEY=your_testnet_secret_key_here
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
PORT=3001
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
```

(Default should work, but you can customize if needed)

## Step 3: Build Contract (Optional)

```bash
cd contract
stellar contract build
```

Or use the build script:
```bash
./contract/build.sh
```

## Step 4: Run the Application

From the root directory:
```bash
npm run dev
```

This starts:
- Backend API on http://localhost:3001
- Frontend UI on http://localhost:3000

## Step 5: Use the App

1. Open http://localhost:3000
2. Click "Connect Freighter" (install extension if needed)
3. Select assets (e.g., USDC → EURC)
4. Enter amount
5. Click "Get Quote"
6. Review route and click "Execute Swap"

## Testing the API

### Get a Quote
```bash
curl -X POST http://localhost:3001/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromAsset": "USDC",
    "toAsset": "EURC",
    "amount": "1000000",
    "slippage": 0.005
  }'
```

### Health Check
```bash
curl http://localhost:3001/health
```

## Troubleshooting

**"Freighter not found"**
- Install Freighter extension: https://freighter.app
- Refresh the page after installation

**"Contract build failed"**
- Ensure Rust is installed: `rustc --version`
- Install wasm32 target: `rustup target add wasm32v1-none`
- Check Stellar CLI: `stellar --version`

**"Backend connection error"**
- Ensure backend is running on port 3001
- Check `backend/.env` configuration
- Verify CORS settings

**"No route found"**
- This is normal on testnet if orderbooks don't exist
- The routing engine will still return a simulated route for demo purposes

## Next Steps

- Deploy your contract to testnet
- Add real asset codes and issuers
- Integrate with actual AMM pools
- Add transaction signing with Freighter

Happy swapping! 🚀
