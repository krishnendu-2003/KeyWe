# KeyWe Frontend (`lovable-next`)

This is the active Next.js frontend for KeyWe. It connects a Freighter wallet, fetches swap quotes from the backend, signs Stellar transactions in the browser, and now includes a Soroban smart contract preview call on the swap screen.

## Where The Smart Contract Integration Lives

Frontend integration files:

- `src/app/swap/page.tsx` - swap UI, quote flow, wallet signing, and Soroban contract preview rendering.
- `src/lib/contract.ts` - frontend helpers for `/api/contract/status` and `/api/contract/preview-swap`.
- `src/lib/api.ts` - frontend helpers for `/api/quote` and `/api/swap`.
- `src/lib/walletContext.tsx` - Freighter connection state and Stellar network details used by the contract-aware swap flow.

Backend and contract files used by this frontend:

- `../backend/src/routes/contract.ts` - frontend-friendly contract endpoints.
- `../backend/src/services/contractService.ts` - Soroban upload, deploy, invoke, and preview logic.
- `../contract/src/lib.rs` - Soroban contract implementation, including `preview_swap`.

## What Was Added

- Replaced the default boilerplate README with project-specific documentation.
- Added a contract-backed swap preview flow so the frontend now calls the Soroban layer through the backend.
- Kept the existing wallet-signed Stellar swap execution path intact for user transaction signing.

## Environment

Frontend:

- `NEXT_PUBLIC_API_URL` - optional override for the backend API base URL.

Backend requirements for contract preview:

- `CONTRACT_ID` - deployed Soroban contract ID.
- `SOROBAN_RPC_URL` - Soroban RPC endpoint.
- `SECRET_KEY` - backend signer used by the contract helper routes.

## Run Locally

From the repository root:

```bash
cd backend
npm install
npm run dev
```

In a second terminal:

```bash
cd lovable-next
npm install
npm run dev
```

Frontend runs on `http://localhost:3000` and expects the backend on `http://localhost:3001` unless `NEXT_PUBLIC_API_URL` is set.
