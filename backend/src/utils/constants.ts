// Stellar Network Constants
export const NETWORKS = {
  TESTNET: {
    passphrase: "Test SDF Network ; September 2015",
    horizon: "https://horizon-testnet.stellar.org",
    sorobanRpc: "https://soroban-testnet.stellar.org",
  },
  MAINNET: {
    passphrase: "Public Global Stellar Network ; September 2015",
    horizon: "https://horizon.stellar.org",
    sorobanRpc: "https://soroban-rpc.mainnet.stellar.org",
  },
};

// Common Asset Codes
export const ASSETS = {
  XLM: "XLM",
  USDC: "USDC",
  EURC: "EURC",
  BTC: "BTC",
  ETH: "ETH",
} as const;

// Default Slippage
export const DEFAULT_SLIPPAGE = 0.005; // 0.5%

// Base Fee (stroops)
export const BASE_FEE = 100; // 0.00001 XLM
