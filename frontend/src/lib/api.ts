const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface QuoteRequest {
  fromAsset: string
  toAsset: string
  amount: string
  slippage: number
  userPublicKey?: string
}

export interface SwapRequest {
  route: any[]
  userPublicKey: string
  amountIn: string
  amountOut: string
  fromAsset: string
  toAsset: string
  slippage: number
}

export async function getQuote(request: QuoteRequest) {
  const response = await fetch(`${API_URL}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get quote')
  }

  return response.json()
}

export async function buildSwapTransaction(request: SwapRequest) {
  const response = await fetch(`${API_URL}/swap/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to build swap transaction')
  }

  return response.json()
}

export async function submitSwapTransaction(signedTransactionXdr: string, networkPassphrase: string) {
  const response = await fetch(`${API_URL}/swap/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signedTransactionXdr,
      networkPassphrase: networkPassphrase
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Failed to submit transaction';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json()
}
