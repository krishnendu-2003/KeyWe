import {
  Account,
  Asset,
  TransactionBuilder,
  Operation,
  BASE_FEE, 
  TimeoutInfinite,
  Networks
} from "@stellar/stellar-sdk";

export interface PathPaymentRequest {
  fromAsset: string;
  toAsset: string;
  amountIn: string;
  amountOut: string;
  userPublicKey: string;
  route: any[];
  slippage?: number; // e.g. 0.005 for 0.5%
}

export interface PathPaymentResponse {
  transactionXdr: string;
  networkPassphrase: string;
}

export class PathPaymentService {
  private horizonUrl: string;
  private networkPassphrase: string;

  constructor() {
    this.horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
    this.networkPassphrase = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;
  }

  async buildPathPaymentTransaction(request: PathPaymentRequest): Promise<PathPaymentResponse> {
    const { fromAsset, toAsset, amountIn, amountOut, userPublicKey, route, slippage } = request;

    // Fetch account to get sequence number
    const accountResponse = await fetch(`${this.horizonUrl}/accounts/${userPublicKey}`);
    if (!accountResponse.ok) {
      throw new Error(`Failed to fetch account: ${accountResponse.statusText}`);
    }
    const accountData: any = await accountResponse.json();

    // Create source account
    const sourceAccount = new Account(userPublicKey, accountData.sequence);

    // Resolve issuers from the user's trustlines so we match Freighter exactly
    const issuerMap = this.getIssuerMapFromAccount(accountData);

    // Convert assets
    const sendAsset = this.getAsset(fromAsset, issuerMap);
    const destAsset = this.getAsset(toAsset, issuerMap);

    // Convert amounts from stroops to proper format
    // Stellar amounts must be strings with at most 7 decimal places
    const sendAmountStroops = BigInt(amountIn);
    const expectedOutStroops = BigInt(amountOut);

    // Apply slippage to destination minimum (strict-send uses destMin)
    // Use integer math to avoid precision loss.
    const slip = typeof slippage === "number" ? slippage : 0.005;
    const bps = Math.max(0, Math.min(10_000, Math.floor(slip * 10_000))); // 0..10000
    const minOutStroops = (expectedOutStroops * BigInt(10_000 - bps)) / 10_000n;
    
    // Convert to decimal format (stroops / 10,000,000)
    const sendAmount = this.formatStellarAmount(sendAmountStroops);
    const destMin = this.formatStellarAmount(minOutStroops);

    // Build path payment transaction
    // Use PathPaymentStrictSend so user spends EXACTLY sendAmount and receives at least destMin
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: sendAsset,
          sendAmount: sendAmount, // Exact amount to send
          destination: userPublicKey, // User receives to their own account
          destAsset: destAsset,
          destMin: destMin, // Minimum amount to receive
          path: this.buildPath(route, issuerMap), // Intermediate assets in the path
        })
      )
      .setTimeout(TimeoutInfinite)
      .build();

    // Return unsigned transaction XDR for user to sign
    return {
      transactionXdr: transaction.toXDR(),
      networkPassphrase: this.networkPassphrase,
    };
  }

  private getIssuerMapFromAccount(accountData: any): Record<string, string> {
    const map: Record<string, string> = {};
    for (const b of accountData?.balances || []) {
      if (b.asset_code && b.asset_issuer) {
        map[String(b.asset_code).toUpperCase()] = String(b.asset_issuer);
      }
    }
    return map;
  }

  private getAsset(assetCode: string, issuerMap: Record<string, string> = {}): Asset {
    if (assetCode === "XLM") {
      return Asset.native();
    }

    // Prefer issuer from the user's trustline to avoid op_no_trust / wrong-issuer
    const issuer = issuerMap[assetCode.toUpperCase()] || this.getIssuerForAsset(assetCode);
    return new Asset(assetCode, issuer);
  }

  private getIssuerForAsset(assetCode: string): string {
    // Testnet issuers - update these with actual testnet asset issuers
    const issuers: Record<string, string> = {
      USDC: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      EURC: "GDUKMGUGD3Q6XK3SX7X6X3X6X3X6X3X6X3X6X3X6X3X6X3X6X3",
    };
    return issuers[assetCode] || "GDUKMGUGD3Q6XK3SX7X6X3X6X3X6X3X6X3X6X3X6X3X6X3X6X3";
  }

  private buildPath(route: any[], issuerMap: Record<string, string>): Asset[] {
    // Extract intermediate assets from route (skip first and last)
    const path: Asset[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const hop = route[i];
      if (hop.toAsset && hop.toAsset !== route[0].fromAsset && hop.toAsset !== route[route.length - 1].toAsset) {
        path.push(this.getAsset(hop.toAsset, issuerMap));
      }
    }
    return path;
  }

  /**
   * Convert stroops (1/10,000,000) to Stellar amount format
   * Must be a string with at most 7 decimal places
   */
  private formatStellarAmount(stroops: bigint): string {
    const STROOPS_PER_UNIT = 10000000n;
    const wholePart = stroops / STROOPS_PER_UNIT;
    const fractionalPart = stroops % STROOPS_PER_UNIT;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    
    // Format fractional part with leading zeros if needed (always 7 digits)
    const fractionalStr = fractionalPart.toString().padStart(7, '0');
    // Remove trailing zeros but keep at least one digit
    const trimmedFractional = fractionalStr.replace(/0+$/, '') || '0';
    
    return `${wholePart}.${trimmedFractional}`;
  }
}
