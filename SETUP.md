# KeyWe Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Rust** (latest stable)
3. **Stellar CLI** - Install from [Stellar Docs](https://developers.stellar.org/docs/tools/stellar-cli)
4. **Freighter Wallet** - Browser extension from [Freighter.app](https://freighter.app)

## Installation

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Backend

1. Copy the environment example:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` and add your Stellar secret key:
```
SECRET_KEY=your_secret_key_here
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
PORT=3001
```

### 3. Setup Frontend

1. Copy the environment example:
```bash
cd frontend
cp .env.local.example .env.local
```

2. Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Build Rust Contract

```bash
cd contract

# Initialize contract (if not already done)
stellar contract init swap_aggregator

# Build the contract
stellar contract build
```

This will generate a `.wasm` file in `target/wasm32v1-none/release/swap_aggregator.wasm`

## Running the Application

### Development Mode

Run both backend and frontend concurrently:

```bash
# From root directory
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Deploy Contract

1. Upload WASM:
```bash
curl -X POST http://localhost:3001/api/contract/upload \
  -H "Content-Type: application/json" \
  -d '{"wasmPath": "./contract/target/wasm32v1-none/release/swap_aggregator.wasm"}'
```

2. Deploy Contract:
```bash
curl -X POST http://localhost:3001/api/contract/deploy \
  -H "Content-Type: application/json" \
  -d '{"wasmHash": "YOUR_WASM_HASH"}'
```

3. Update backend `.env` with the contract ID:
```
CONTRACT_ID=YOUR_CONTRACT_ID
```

## Usage

1. Open http://localhost:3000 in your browser
2. Connect your Freighter wallet
3. Select assets and amount
4. Click "Get Quote" to see the best route
5. Click "Execute Swap" to perform the swap

## API Endpoints

### Get Quote
```bash
POST /api/quote
{
  "fromAsset": "USDC",
  "toAsset": "EURC",
  "amount": "1000000",
  "slippage": 0.005
}
```

### Execute Swap
```bash
POST /api/swap/execute
{
  "route": [...],
  "userPublicKey": "G..."
}
```

### Upload Contract WASM
```bash
POST /api/contract/upload
{
  "wasmPath": "./path/to/contract.wasm"
}
```

### Deploy Contract
```bash
POST /api/contract/deploy
{
  "wasmHash": "hash_from_upload"
}
```

## Project Structure

```
KeyWe/
├── backend/           # Node.js/TypeScript API
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   └── utils/     # Utilities (routing engine)
│   └── package.json
├── frontend/          # Next.js React app
│   ├── src/
│   │   ├── app/       # Next.js app router
│   │   ├── components/# React components
│   │   └── lib/       # Utilities & API client
│   └── package.json
├── contract/          # Rust Soroban contract
│   ├── src/
│   │   └── lib.rs     # Contract code
│   └── Cargo.toml
└── package.json       # Root workspace config
```

## Troubleshooting

### Contract Build Issues
- Ensure Rust is installed: `rustc --version`
- Install wasm32 target: `rustup target add wasm32v1-none`
- Check Stellar CLI: `stellar --version`

### Wallet Connection Issues
- Ensure Freighter extension is installed
- Check that you're on testnet
- Verify network settings in Freighter

### API Connection Issues
- Ensure backend is running on port 3001
- Check CORS settings in backend
- Verify environment variables are set correctly

## Next Steps

- Add more sophisticated routing algorithms
- Integrate with real AMM pools
- Add transaction signing with Freighter
- Implement caching for orderbooks
- Add analytics and monitoring
