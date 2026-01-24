export interface RouteHop {
  type: "orderbook" | "amm";
  fromAsset: string;
  toAsset: string;
  poolId?: string;
  orderbookId?: string;
  liquidity?: bigint;
  fee?: number;
}

export class RoutingEngine {
  private horizonUrl: string;
  private liquidityGraph: Map<string, Map<string, RouteHop[]>>;

  constructor(horizonUrl: string) {
    this.horizonUrl = horizonUrl;
    this.liquidityGraph = new Map();
  }

  async findBestRoute(
    fromAsset: string,
    toAsset: string,
    amount: bigint
  ): Promise<RouteHop[]> {
    // Build liquidity graph
    await this.buildLiquidityGraph();

    // Use Dijkstra's algorithm to find shortest path
    const route = this.dijkstra(fromAsset, toAsset, amount);

    return route;
  }

  private async buildLiquidityGraph(): Promise<void> {
    // Fetch orderbooks from Horizon
    // In production, this would cache and update periodically
    const commonAssets = ["USDC", "EURC", "XLM"];

    for (const asset1 of commonAssets) {
      for (const asset2 of commonAssets) {
        if (asset1 === asset2) continue;

        try {
          // Use Horizon API directly
          const sellingAssetType = asset1 === "XLM" ? "native" : "credit_alphanum4";
          const sellingAssetCode = asset1 === "XLM" ? "" : asset1;
          const buyingAssetType = asset2 === "XLM" ? "native" : "credit_alphanum4";
          const buyingAssetCode = asset2 === "XLM" ? "" : asset2;
          
          let orderbookUrl = `${this.horizonUrl}/order_book?selling_asset_type=${sellingAssetType}`;
          if (sellingAssetCode) {
            orderbookUrl += `&selling_asset_code=${sellingAssetCode}`;
            // Add issuer for non-native assets (using testnet USDC issuer)
            if (asset1 === "USDC") {
              orderbookUrl += `&selling_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`;
            } else if (asset1 === "EURC") {
              orderbookUrl += `&selling_asset_issuer=GDUKMGUGD3Q6XK3SX7X6X3X6X3X6X3X6X3X6X3X6X3X6X3X6X3`;
            }
          }
          orderbookUrl += `&buying_asset_type=${buyingAssetType}`;
          if (buyingAssetCode) {
            orderbookUrl += `&buying_asset_code=${buyingAssetCode}`;
            // Add issuer for non-native assets
            if (asset2 === "USDC") {
              orderbookUrl += `&buying_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`;
            } else if (asset2 === "EURC") {
              orderbookUrl += `&buying_asset_issuer=GDUKMGUGD3Q6XK3SX7X6X3X6X3X6X3X6X3X6X3X6X3X6X3X6X3`;
            }
          }
          
          const orderbookResponse = await fetch(orderbookUrl);
          if (orderbookResponse.ok) {
            const orderbook: any = await orderbookResponse.json();
            if (orderbook.bids?.length > 0 || orderbook.asks?.length > 0) {
              // Calculate total liquidity from bids
              let totalLiquidity = BigInt(0);
              if (orderbook.bids) {
                for (const bid of orderbook.bids) {
                  totalLiquidity += BigInt(Math.floor(parseFloat(bid.amount) * 10000000));
                }
              }
              
              this.addEdge(asset1, asset2, {
                type: "orderbook",
                fromAsset: asset1,
                toAsset: asset2,
                orderbookId: `${asset1}-${asset2}`,
                liquidity: totalLiquidity,
                fee: 0.003 // 0.3% typical DEX fee
              });
            }
          }
        } catch (error) {
          // Orderbook might not exist, continue
          console.log(`No orderbook found for ${asset1}/${asset2}`);
        }
      }
    }

    // Add direct XLM paths (always available)
    commonAssets.forEach(asset => {
      if (asset !== "XLM") {
        this.addEdge("XLM", asset, {
          type: "orderbook",
          fromAsset: "XLM",
          toAsset: asset,
          orderbookId: `XLM-${asset}`,
          liquidity: BigInt(1000000000),
          fee: 0.001
        });

        this.addEdge(asset, "XLM", {
          type: "orderbook",
          fromAsset: asset,
          toAsset: "XLM",
          orderbookId: `${asset}-XLM`,
          liquidity: BigInt(1000000000),
          fee: 0.001
        });
      }
    });
  }

  private addEdge(from: string, to: string, hop: RouteHop): void {
    if (!this.liquidityGraph.has(from)) {
      this.liquidityGraph.set(from, new Map());
    }

    const fromMap = this.liquidityGraph.get(from)!;
    if (!fromMap.has(to)) {
      fromMap.set(to, []);
    }

    fromMap.get(to)!.push(hop);
  }

  private dijkstra(
    from: string,
    to: string,
    amount: bigint
  ): RouteHop[] {
    const distances = new Map<string, { cost: number; path: RouteHop[] }>();
    const visited = new Set<string>();
    const queue: string[] = [from];

    distances.set(from, { cost: 0, path: [] });

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      if (current === to) {
        return distances.get(to)!.path;
      }

      const neighbors = this.liquidityGraph.get(current);
      if (!neighbors) continue;

      for (const [neighbor, hops] of neighbors.entries()) {
        if (visited.has(neighbor)) continue;

        for (const hop of hops) {
          const cost = (distances.get(current)?.cost || 0) + (hop.fee || 0.01);
          const existingCost = distances.get(neighbor)?.cost || Infinity;

          if (cost < existingCost) {
            distances.set(neighbor, {
              cost,
              path: [...distances.get(current)!.path, hop]
            });
            queue.push(neighbor);
          }
        }
      }
    }

    return [];
  }

  async simulateHop(hop: RouteHop, amount: bigint): Promise<bigint> {
    // Query actual orderbook to get real prices
    try {
      const { fromAsset, toAsset } = hop;
      
      // Build orderbook URL
      const sellingAssetType = fromAsset === "XLM" ? "native" : "credit_alphanum4";
      const sellingAssetCode = fromAsset === "XLM" ? "" : fromAsset;
      const buyingAssetType = toAsset === "XLM" ? "native" : "credit_alphanum4";
      const buyingAssetCode = toAsset === "XLM" ? "" : toAsset;
      
      let orderbookUrl = `${this.horizonUrl}/order_book?selling_asset_type=${sellingAssetType}`;
      if (sellingAssetCode) {
        orderbookUrl += `&selling_asset_code=${sellingAssetCode}`;
        if (fromAsset === "USDC") {
          orderbookUrl += `&selling_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`;
        } else if (fromAsset === "EURC") {
          orderbookUrl += `&selling_asset_issuer=GDUKMGUGD3Q6XK3SX7X6X3X6X3X6X3X6X3X6X3X6X3X6X3X6X3`;
        }
      }
      orderbookUrl += `&buying_asset_type=${buyingAssetType}`;
      if (buyingAssetCode) {
        orderbookUrl += `&buying_asset_code=${buyingAssetCode}`;
        if (toAsset === "USDC") {
          orderbookUrl += `&buying_asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`;
        } else if (toAsset === "EURC") {
          orderbookUrl += `&buying_asset_issuer=GDUKMGUGD3Q6XK3SX7X6X3X6X3X6X3X6X3X6X3X6X3X6X3X6X3`;
        }
      }
      
      const orderbookResponse = await fetch(orderbookUrl);
      if (!orderbookResponse.ok) {
        throw new Error(`Failed to fetch orderbook: ${orderbookResponse.statusText}`);
      }
      
      const orderbook: any = await orderbookResponse.json();
      
      // Convert amount to decimal (stroops to units)
      const amountDecimal = Number(amount) / 10000000;
      
      // In Stellar orderbook:
      // - selling_asset is what we're selling (fromAsset)
      // - buying_asset is what we're buying (toAsset)
      // - asks are offers to sell the buying_asset (toAsset) for the selling_asset (fromAsset)
      // - price in asks is: amount of selling_asset / amount of buying_asset
      // So to buy 1 unit of toAsset, we need to pay (price) units of fromAsset
      
      let totalOutput = 0;
      let remainingToSpend = amountDecimal;
      const fee = hop.fee || 0.003;
      
      if (orderbook.asks && orderbook.asks.length > 0) {
        // Use asks: people selling toAsset for fromAsset
        for (const ask of orderbook.asks) {
          const askPrice = parseFloat(ask.price); // price = fromAsset/toAsset
          const askAmount = parseFloat(ask.amount); // amount of toAsset available
          
          // How much fromAsset we need to spend to buy this ask
          const fromAssetNeeded = askAmount * askPrice;
          
          // How much we can actually buy from this ask
          const fromAssetToSpend = Math.min(remainingToSpend, fromAssetNeeded);
          const toAssetReceived = fromAssetToSpend / askPrice;
          
          totalOutput += toAssetReceived;
          remainingToSpend -= fromAssetToSpend;
          
          if (remainingToSpend <= 0.0000001) break; // Small epsilon for floating point
        }
      }
      
      // If we couldn't fill the entire order from asks, try using bids as fallback
      if (remainingToSpend > 0.0000001 && orderbook.bids && orderbook.bids.length > 0) {
        // Bids are offers to buy fromAsset, paying in toAsset
        // price in bids is: amount of toAsset / amount of fromAsset
        const bestBid = orderbook.bids[0];
        const bidPrice = parseFloat(bestBid.price); // price = toAsset/fromAsset
        const additionalOutput = remainingToSpend * bidPrice;
        totalOutput += additionalOutput;
        remainingToSpend = 0;
      }
      
      // If still no output, use best available price
      if (totalOutput === 0) {
        if (orderbook.asks && orderbook.asks.length > 0) {
          const bestAskPrice = parseFloat(orderbook.asks[0].price);
          totalOutput = amountDecimal / bestAskPrice;
        } else if (orderbook.bids && orderbook.bids.length > 0) {
          const bestBidPrice = parseFloat(orderbook.bids[0].price);
          totalOutput = amountDecimal * bestBidPrice;
        } else {
          // No orderbook data, use simple 1:1 with fee
          totalOutput = amountDecimal * (1 - fee);
        }
      }
      
      // Apply fee
      totalOutput = totalOutput * (1 - fee);
      
      // Convert back to stroops
      return BigInt(Math.floor(totalOutput * 10000000));
    } catch (error) {
      console.error(`Error simulating hop ${hop.fromAsset} -> ${hop.toAsset}:`, error);
      // Fallback to simple fee-based calculation
      const fee = hop.fee || 0.003;
      const amountDecimal = Number(amount) / 10000000;
      const outputDecimal = amountDecimal * (1 - fee);
      return BigInt(Math.floor(outputDecimal * 10000000));
    }
  }

}
