// IMPORTANT (static export / AWS):
// - In production builds, we default to same-origin `/api` so you can route it via
//   CloudFront (path pattern `/api/*`) to your backend without CORS issues.
// - In development, default to localhost backend.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3001/api");

export interface QuoteRequest {
  fromAsset: string;
  toAsset: string;
  amount: string;
  slippage: number;
  userPublicKey?: string;
}

export interface SwapRouteHop {
  type: string;
  fromAsset: string;
  toAsset: string;
  amountIn: string;
  amountOut: string;
}

export interface QuoteResponse {
  fromAsset: string;
  toAsset: string;
  amountIn: string;
  amountOut: string;
  route: SwapRouteHop[];
  priceImpact: number;
  slippage: number;
  estimatedGas: string;
}

export interface SwapRequest {
  route: SwapRouteHop[];
  userPublicKey: string;
  amountIn: string;
  amountOut: string;
  fromAsset: string;
  toAsset: string;
  slippage: number;
}

async function parseError(response: Response, fallback: string) {
  try {
    const error = (await response.json()) as { error?: string };
    return error?.error || fallback;
  } catch {
    return `HTTP ${response.status}: ${response.statusText || fallback}`;
  }
}

export async function getQuote(request: QuoteRequest): Promise<QuoteResponse> {
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

export interface BuildSwapTransactionResponse {
  transactionXdr?: string;
  transactionHash?: string;
  status: string;
  amountOut: string;
  networkPassphrase?: string;
  needsSignature?: boolean;
}

export async function buildSwapTransaction(
  request: SwapRequest,
): Promise<BuildSwapTransactionResponse> {
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
): Promise<{ transactionHash?: string; status: string; amountOut: string }> {
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

