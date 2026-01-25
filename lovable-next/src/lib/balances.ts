export interface AssetBalance {
  asset: string;
  balance: string;
  code: string;
  issuer?: string;
}

// See `src/lib/api.ts` for rationale.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3001/api");

async function fetchBalancesFromHorizon(publicKey: string, horizonUrl: string): Promise<AssetBalance[]> {
  const response = await fetch(`${horizonUrl.replace(/\/$/, "")}/accounts/${publicKey}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error("Account not found on selected network");
    throw new Error(`Failed to fetch account: ${response.statusText || "Horizon error"}`);
  }

  const accountData: any = await response.json();
  const resultBalances: AssetBalance[] = [];
  const assetMap = new Map<string, AssetBalance>();

  const accountBalances = accountData?.balances || [];
  accountBalances.forEach((balance: any) => {
    if (balance.asset_type === "native") {
      assetMap.set("XLM", { asset: "XLM", balance: balance.balance, code: "XLM" });
      return;
    }
    if (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") {
      const code = String(balance.asset_code || "").toUpperCase();
      if (!code) return;
      if (!assetMap.has(code)) {
        assetMap.set(code, {
          asset: code,
          balance: balance.balance,
          code,
          issuer: balance.asset_issuer,
        });
      }
    }
  });

  resultBalances.push(...Array.from(assetMap.values()));

  // Ensure expected assets exist for UI.
  ["XLM", "USDC", "EURC"].forEach((asset) => {
    if (!resultBalances.find((b) => b.asset === asset)) {
      resultBalances.push({ asset, balance: "0.0000000", code: asset });
    }
  });

  return resultBalances.sort((a, b) => {
    const order = ["XLM", "USDC", "EURC"];
    const aIndex = order.indexOf(a.asset);
    const bIndex = order.indexOf(b.asset);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.asset.localeCompare(b.asset);
  });
}

export async function fetchAccountBalances(publicKey: string, opts?: { horizonUrl?: string }): Promise<AssetBalance[]> {
  try {
    if (opts?.horizonUrl) {
      return await fetchBalancesFromHorizon(publicKey, opts.horizonUrl);
    }

    const response = await fetch(`${API_URL}/balance/${publicKey}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.error || "Failed to fetch balances");
    }

    return await response.json();
  } catch (error) {
    // Keep UI stable even if Horizon/backend is flaky.
    return [
      { asset: "XLM", balance: "0.0000000", code: "XLM" },
      { asset: "USDC", balance: "0.0000000", code: "USDC" },
      { asset: "EURC", balance: "0.0000000", code: "EURC" },
    ];
  }
}

export function formatBalance(balance: string): string {
  const num = Number.parseFloat(balance);
  if (!Number.isFinite(num) || num === 0) return "0.00";
  if (num < 0.01) return num.toFixed(7);
  if (num < 1) return num.toFixed(4);
  return num.toFixed(2);
}

