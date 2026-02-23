const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface QuoteRequest {
  fromAsset: string;
  toAsset: string;
  amount: string;
  slippage: number;
  userPublicKey?: string;
}

export interface SwapRequest {
  route: any[];
  userPublicKey: string;
  amountIn: string;
  amountOut: string;
  fromAsset: string;
  toAsset: string;
  slippage: number;
}

async function parseError(response: Response, fallback: string) {
  try {
    const error = await response.json();
    return error?.error || fallback;
  } catch {
    return `HTTP ${response.status}: ${response.statusText || fallback}`;
  }
}

export async function getQuote(request: QuoteRequest) {
  const response = await fetch(`${API_URL}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to get quote"));
  }

  return response.json();
}

export async function buildSwapTransaction(request: SwapRequest) {
  const response = await fetch(`${API_URL}/swap/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to build swap transaction"));
  }

  return response.json();
}

export async function submitSwapTransaction(
  signedTransactionXdr: string,
  networkPassphrase: string,
) {
  const response = await fetch(`${API_URL}/swap/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedTransactionXdr, networkPassphrase }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to submit transaction"));
  }

  return response.json();
}

