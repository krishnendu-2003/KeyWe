// import { RoutingEngine } from "../utils/routingEngine.js";

// export interface QuoteRequest {
//   fromAsset: string;
//   toAsset: string;
//   amount: bigint;
//   slippage: number;
// }

// export interface QuoteResponse {
//   fromAsset: string;
//   toAsset: string;
//   amountIn: string;
//   amountOut: string;
//   route: RouteHop[];
//   priceImpact: number;
//   slippage: number;
//   estimatedGas: string;
// }

// export interface RouteHop {
//   type: "orderbook" | "amm";
//   fromAsset: string;
//   toAsset: string;
//   amountIn: string;
//   amountOut: string;
//   poolId?: string;
//   orderbookId?: string;
// }

// export class QuoteService {
//   private horizonUrl: string;
//   private routingEngine: RoutingEngine;

//   constructor() {
//     this.horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
//     this.routingEngine = new RoutingEngine(this.horizonUrl);
//   }

//   async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
//     const { fromAsset, toAsset, amount, slippage } = request;

//     // Find best route using routing engine
//     const route = await this.routingEngine.findBestRoute(
//       fromAsset,
//       toAsset,
//       amount
//     );

//     if (!route || route.length === 0) {
//       throw new Error(`No route found from ${fromAsset} to ${toAsset}`);
//     }

//     // Calculate total output amount
//     let currentAmount = amount;
//     const routeHops: RouteHop[] = [];

//     for (const hop of route) {
//       const outputAmount = await this.routingEngine.simulateHop(
//         hop,
//         currentAmount
//       );

//       routeHops.push({
//         type: hop.type,
//         fromAsset: hop.fromAsset,
//         toAsset: hop.toAsset,
//         amountIn: currentAmount.toString(),
//         amountOut: outputAmount.toString(),
//         poolId: hop.poolId,
//         orderbookId: hop.orderbookId
//       });

//       currentAmount = outputAmount;
//     }

//     const totalOutput = currentAmount;
//     const priceImpact = this.calculatePriceImpact(amount, totalOutput, route);

//     return {
//       fromAsset,
//       toAsset,
//       amountIn: amount.toString(),
//       amountOut: totalOutput.toString(),
//       route: routeHops,
//       priceImpact,
//       slippage,
//       estimatedGas: "100000" // Estimated base fee
//     };
//   }

//   private calculatePriceImpact(
//     inputAmount: bigint,
//     outputAmount: bigint,
//     route: any[]
//   ): number {
//     // Simplified price impact calculation
//     // In production, this would use actual market prices
//     const impact = Number(outputAmount) / Number(inputAmount);
//     return Math.abs(1 - impact) * 100; // Percentage
//   }
// }



import fetch from "node-fetch";
import { ASSETS } from "../utils/assets";

export interface QuoteRequest {
  fromAsset: string; // "XLM", "USDC"
  toAsset: string;
  amount: bigint;
  slippage: number;
  userPublicKey?: string;
}

export interface RouteHop {
  type: "orderbook" | "amm";
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
  route: RouteHop[];
  priceImpact: number;
  slippage: number;
  estimatedGas: string;
}

function parseAsset(assetSymbol: string, issuerOverride?: string) {
  if (assetSymbol === "XLM") return { type: "native" as const };

  if (issuerOverride) {
    return { type: "credit_alphanum4" as const, code: assetSymbol, issuer: issuerOverride };
  }

  const resolved = ASSETS[assetSymbol];

  if (!resolved) {
    throw new Error(`Unsupported asset: ${assetSymbol}`);
  }

  if (resolved === "native") {
    return { type: "native" as const };
  }

  const [code, issuer] = resolved.split(":");

  return {
    type: "credit_alphanum4" as const,
    code,
    issuer,
  };
}

function assetToHorizonOrderbookParams(asset: ReturnType<typeof parseAsset>, prefix: "selling" | "buying") {
  if (asset.type === "native") {
    return `${prefix}_asset_type=native`;
  }

  const params = new URLSearchParams();
  params.append(`${prefix}_asset_type`, asset.type);
  params.append(`${prefix}_asset_code`, asset.code);
  params.append(`${prefix}_asset_issuer`, asset.issuer);
  return params.toString();
}

function stroopsToAmountString(stroops: bigint): string {
  // Horizon expects amounts as decimal strings with up to 7 decimals
  const STROOPS_PER_UNIT = 10000000n;
  const wholePart = stroops / STROOPS_PER_UNIT;
  const fractionalPart = stroops % STROOPS_PER_UNIT;

  if (fractionalPart === 0n) return wholePart.toString();

  const fractionalStr = fractionalPart.toString().padStart(7, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "") || "0";
  return `${wholePart}.${trimmedFractional}`;
}

function amountStringToStroops(amountStr: string): bigint {
  // e.g. "12.345" -> 123450000
  const [whole, frac = ""] = amountStr.split(".");
  const fracPadded = (frac + "0000000").slice(0, 7);
  const sign = whole.startsWith("-") ? -1n : 1n;
  const wholeAbs = whole.replace("-", "");
  const wholePart = BigInt(wholeAbs || "0") * 10000000n;
  const fracPart = BigInt(fracPadded || "0");
  return sign * (wholePart + fracPart);
}

export class QuoteService {
  private horizonUrl: string;

  constructor() {
    this.horizonUrl =
      process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
  }

  // async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
  //   const { fromAsset, toAsset, amount, slippage } = request;

  //   const source = parseAsset(fromAsset);
  //   const destination = parseAsset(toAsset);

  //   const params = new URLSearchParams({
  //     source_amount: amount.toString(),
  //     destination_assets:
  //       destination.type === "native"
  //         ? "native"
  //         : `${destination.code}:${destination.issuer}`,
  //   });

  //   if (source.type !== "native") {
  //     params.append("source_asset_type", source.type);
  //     params.append("source_asset_code", source.code!);
  //     params.append("source_asset_issuer", source.issuer!);
  //   }

  //   const url = `${this.horizonUrl}/paths/strict-send?${params.toString()}`;

  //   const res = await fetch(url);
  //   const json: any = await res.json();

  //   if (!json._embedded?.records?.length) {
  //     throw new Error(`No route found from ${fromAsset} to ${toAsset}`);
  //   }

  //   const bestPath = json._embedded.records[0];

  //   return {
  //     fromAsset,
  //     toAsset,
  //     amountIn: amount.toString(),
  //     amountOut: bestPath.destination_amount,
  //     route: bestPath.path.map(() => ({
  //       type: "orderbook",
  //       fromAsset,
  //       toAsset,
  //       amountIn: amount.toString(),
  //       amountOut: bestPath.destination_amount,
  //     })),
  //     priceImpact: 0,
  //     slippage,
  //     estimatedGas: "100000",
  //   };
  // }

  private async getIssuerMap(userPublicKey: string): Promise<Record<string, string>> {
    // Map: asset_code -> asset_issuer based on the user's trustlines.
    const res = await fetch(`${this.horizonUrl}/accounts/${userPublicKey}`);
    if (!res.ok) return {};
    const account: any = await res.json();
    const map: Record<string, string> = {};

    for (const b of account.balances || []) {
      if (b.asset_code && b.asset_issuer) {
        map[String(b.asset_code).toUpperCase()] = String(b.asset_issuer);
      }
    }
    return map;
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const { fromAsset, toAsset, amount, slippage, userPublicKey } = request;
  
    try {
      const issuerMap = userPublicKey ? await this.getIssuerMap(userPublicKey) : {};
      const source = parseAsset(fromAsset, issuerMap[fromAsset]?.toString());
      const destination = parseAsset(toAsset, issuerMap[toAsset]?.toString());
    
      const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
      const amountString = stroopsToAmountString(amountBigInt);

      // Horizon strict-send endpoint expects:
      // - source_asset_type (+ code/issuer if credit)
      // - source_amount (string, up to 7 decimals)
      // - destination_assets (comma-separated: "native" or "CODE:ISSUER")
      const destinationAssetString =
        destination.type === "native" ? "native" : `${destination.code}:${destination.issuer}`;

      const params = new URLSearchParams();
      params.append("source_amount", amountString);
      params.append("source_asset_type", source.type);
      if (source.type !== "native") {
        params.append("source_asset_code", source.code);
        params.append("source_asset_issuer", source.issuer);
      }
      params.append("destination_assets", destinationAssetString);

      const url = `${this.horizonUrl}/paths/strict-send?${params.toString()}`;
      console.log("Fetching path from Horizon:", url);

      let json: any = null;
      try {
        const res = await fetch(url);
        if (res.ok) {
          json = await res.json();
        } else {
          const errorText = await res.text();
          console.warn("Horizon API error:", res.status, errorText.slice(0, 400));
        }
      } catch (e: any) {
        console.warn("Horizon fetch failed:", e.message);
      }

      if (json?._embedded?.records?.length) {
        const bestPath = json._embedded.records[0];
        const destAmountStroops = amountStringToStroops(bestPath.destination_amount);

        return {
          fromAsset,
          toAsset,
          amountIn: amountBigInt.toString(),
          amountOut: destAmountStroops.toString(),
          route: [
            {
              type: "orderbook",
              fromAsset,
              toAsset,
              amountIn: amountBigInt.toString(),
              amountOut: destAmountStroops.toString(),
            },
          ],
          priceImpact: 0,
          slippage,
          estimatedGas: "100000",
        };
      }

      // Fallback: derive price from orderbook best ask (real market data if exists)
      const fee = 0.003;
      const orderbookUrl = `${this.horizonUrl}/order_book?${assetToHorizonOrderbookParams(source, "selling")}&${assetToHorizonOrderbookParams(destination, "buying")}`;
      console.log("Fallback orderbook:", orderbookUrl);
      const obRes = await fetch(orderbookUrl);
      if (obRes.ok) {
        const ob: any = await obRes.json();
        // Prefer best bid (what you can actually get when selling fromAsset),
        // fallback to best ask if bids are empty.
        const bestPriceStr: string | undefined = ob.bids?.[0]?.price || ob.asks?.[0]?.price;

        if (bestPriceStr) {
          // In Horizon order_book, `price` is expressed as:
          // buying_asset / selling_asset (i.e. units of `toAsset` per 1 unit of `fromAsset`)
          // So when converting fromAsset -> toAsset:
          // toUnits = fromUnits * price
          const price = parseFloat(bestPriceStr);
          const fromUnits = Number(amountBigInt) / 1e7;
          const toUnits = (fromUnits * price) * (1 - fee);
          const outStroops = BigInt(Math.floor(toUnits * 1e7));
          return {
            fromAsset,
            toAsset,
            amountIn: amountBigInt.toString(),
            amountOut: outStroops.toString(),
            route: [
              {
                type: "orderbook",
                fromAsset,
                toAsset,
                amountIn: amountBigInt.toString(),
                amountOut: outStroops.toString(),
              },
            ],
            priceImpact: fee * 100,
            slippage,
            estimatedGas: "100000",
          };
        }
      }

      throw new Error(`No route found from ${fromAsset} to ${toAsset}`);
    } catch (error: any) {
      console.error('Quote service error:', error);
      throw error;
    }
  }
  
}
