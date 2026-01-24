// React Native compatible Stellar transaction builder
// Avoiding the full Stellar SDK to prevent Node.js module issues

export class TxBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TxBuildError';
  }
}

// Simple transaction builder for React Native
export async function buildPaymentTx(
  sourceAccount: string,
  destination: string,
  amount: string,
  memo: string,
  network: 'testnet' | 'mainnet' = 'testnet'
) {
  try {
    // For now, return a mock transaction object
    // In a real implementation, you would build the XDR here
    const mockTransaction = {
      source: sourceAccount,
      destination,
      amount,
      memo,
      network,
      toXDR: () => `mock-xdr-${Date.now()}`, // Mock XDR
    };
    
    return mockTransaction;
    
  } catch (error) {
    console.error('Transaction build error:', error);
    throw new TxBuildError(
      error instanceof Error ? error.message : 'Failed to build transaction'
    );
  }
}

export async function submitTransaction(
  signedTxXdr: string,
  network: 'testnet' | 'mainnet' = 'testnet'
) {
  try {
    // Mock successful transaction submission
    const mockResult = {
      hash: `mock-hash-${Date.now()}`,
      successful: true,
      ledger: Math.floor(Math.random() * 1000000),
    };
    
    return mockResult;
    
  } catch (error) {
    console.error('Transaction submission error:', error);
    throw new TxBuildError(
      error instanceof Error ? error.message : 'Failed to submit transaction'
    );
  }
}