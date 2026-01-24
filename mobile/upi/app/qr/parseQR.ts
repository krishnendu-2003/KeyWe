import { PaymentData } from '../store/paymentStore';

export class QRParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QRParseError';
  }
}

export function parsePaymentQR(qrData: string): PaymentData {
  try {
    // Try to decode as base64 first
    let jsonString: string;
    try {
      jsonString = atob(qrData);
    } catch {
      // If not base64, assume it's plain JSON
      jsonString = qrData;
    }

    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.protocol || parsed.protocol !== 'keywepay') {
      throw new QRParseError('Invalid protocol. Expected "keywepay"');
    }
    
    if (!parsed.network || !['testnet', 'mainnet'].includes(parsed.network)) {
      throw new QRParseError('Invalid network. Must be "testnet" or "mainnet"');
    }
    
    if (!parsed.destination || !parsed.destination.startsWith('G')) {
      throw new QRParseError('Invalid destination address');
    }
    
    if (!parsed.amount || isNaN(parseFloat(parsed.amount))) {
      throw new QRParseError('Invalid amount');
    }
    
    if (!parsed.asset) {
      throw new QRParseError('Asset is required');
    }
    
    if (!parsed.memo) {
      throw new QRParseError('Memo is required');
    }

    return {
      protocol: parsed.protocol,
      network: parsed.network,
      destination: parsed.destination,
      amount: parsed.amount,
      asset: parsed.asset,
      memo: parsed.memo,
      callback: parsed.callback
    };
    
  } catch (error) {
    if (error instanceof QRParseError) {
      throw error;
    }
    throw new QRParseError('Invalid QR code format');
  }
}

// Helper function to generate QR for testing
export function generateTestQR(): string {
  const testPayment = {
    protocol: 'keywepay',
    network: 'testnet',
    destination: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    amount: '10',
    asset: 'XLM',
    memo: 'TEST_ORDER_123',
    callback: 'https://merchant.example.com/payment-status'
  };
  
  return btoa(JSON.stringify(testPayment));
}