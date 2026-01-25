export type HorizonTransaction = {
  id: string;
  paging_token: string;
  successful: boolean;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  source_account_sequence: string;
  fee_account: string;
  fee_charged: string;
  max_fee: string;
  operation_count: number;
  memo_type: string;
  memo?: string;
  signatures?: string[];
  envelope_xdr?: string;
  result_xdr?: string;
  result_meta_xdr?: string;
  fee_meta_xdr?: string;
  time_bounds?: { min_time: string; max_time: string };
  _links?: any;
};

export type HorizonOperation = {
  id: string;
  paging_token: string;
  transaction_hash: string;
  type: string;
  type_i: number;
  created_at: string;
  source_account?: string;
  // payment
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  // path payment strict send/receive (Horizon naming varies by op type)
  source_amount?: string;
  source_asset_type?: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  destination_amount?: string;
  destination_asset_type?: string;
  destination_asset_code?: string;
  destination_asset_issuer?: string;
  // strict send fields (sometimes exposed as "send_*" / "dest_*")
  send_amount?: string;
  send_asset_type?: string;
  send_asset_code?: string;
  send_asset_issuer?: string;
  dest_amount?: string;
  dest_asset_type?: string;
  dest_asset_code?: string;
  dest_asset_issuer?: string;
  // generic fallbacks
  [k: string]: any;
};

type Embedded<T> = { _embedded: { records: T[] } };

function normalizeHorizonUrl(horizonUrl: string) {
  return horizonUrl.replace(/\/$/, "");
}

export function explorerNetworkFromHorizonUrl(horizonUrl: string): "testnet" | "public" {
  return horizonUrl.includes("testnet") ? "testnet" : "public";
}

export function assetCodeFromOp(op: HorizonOperation, prefix: "asset" | "source_asset" | "destination_asset" | "send_asset" | "dest_asset") {
  const typeKey = `${prefix}_type`;
  const codeKey = `${prefix}_code`;
  const assetType = String(op[typeKey] ?? "");
  if (assetType === "native") return "XLM";
  const code = op[codeKey];
  return code ? String(code).toUpperCase() : "UNKNOWN";
}

export async function fetchAccountTransactions(params: {
  horizonUrl: string;
  publicKey: string;
  limit?: number;
  cursor?: string;
}): Promise<HorizonTransaction[]> {
  const { horizonUrl, publicKey, limit = 50, cursor } = params;
  const base = normalizeHorizonUrl(horizonUrl);
  const qs = new URLSearchParams({
    order: "desc",
    limit: String(limit),
    ...(cursor ? { cursor } : {}),
  });
  const res = await fetch(`${base}/accounts/${publicKey}/transactions?${qs.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Account not found on selected network");
    throw new Error(`Failed to fetch transactions: ${res.statusText || "Horizon error"}`);
  }
  const json: Embedded<HorizonTransaction> = await res.json();
  return json?._embedded?.records || [];
}

export async function fetchTransactionOperations(params: {
  horizonUrl: string;
  txHash: string;
  limit?: number;
}): Promise<HorizonOperation[]> {
  const { horizonUrl, txHash, limit = 200 } = params;
  const base = normalizeHorizonUrl(horizonUrl);
  const res = await fetch(`${base}/transactions/${txHash}/operations?order=asc&limit=${limit}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch operations: ${res.statusText || "Horizon error"}`);
  }
  const json: Embedded<HorizonOperation> = await res.json();
  return json?._embedded?.records || [];
}

