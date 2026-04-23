"use client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3001/api");

async function parseError(response: Response, fallback: string) {
  try {
    const error = await response.json();
    return error?.error || fallback;
  } catch {
    return `HTTP ${response.status}: ${response.statusText || fallback}`;
  }
}

export interface ContractStatusResponse {
  configured: boolean;
  contractId: string | null;
  sorobanRpcUrl: string;
}

export interface PreviewSwapRequest {
  amount: string;
  hops: number;
  contractId?: string;
}

export interface PreviewSwapResponse {
  contractId: string;
  transactionHash: string;
  estimatedAmountOut: string | null;
}

export async function getContractStatus(): Promise<ContractStatusResponse> {
  const response = await fetch(`${API_URL}/contract/status`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load contract status"));
  }

  return response.json();
}

export async function previewSwapWithContract(
  request: PreviewSwapRequest,
): Promise<PreviewSwapResponse> {
  const response = await fetch(`${API_URL}/contract/preview-swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to preview swap via contract"));
  }

  return response.json();
}
