
export interface AssetBalance {
  asset: string;
  balance: string;
  code: string;
  issuer?: string;
}

export class BalanceService {
  private horizonUrl: string;

  constructor() {
    this.horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
  }

  async getAccountBalances(publicKey: string): Promise<AssetBalance[]> {
    try {
      console.log(`Fetching balances for account: ${publicKey}`);
      
      // Try testnet first
      let accountData;
      let network = 'testnet';
      let horizonUrl = this.horizonUrl;
      
      try {
        const response = await fetch(`${horizonUrl}/accounts/${publicKey}`);
        if (!response.ok) {
          if (response.status === 404) {
            // Try mainnet
            console.log('Account not found on testnet, trying mainnet...');
            horizonUrl = 'https://horizon.stellar.org';
            const mainnetResponse = await fetch(`${horizonUrl}/accounts/${publicKey}`);
            if (!mainnetResponse.ok) {
              throw new Error(`Account not found on testnet or mainnet: ${publicKey}`);
            }
            accountData = await mainnetResponse.json();
            network = 'mainnet';
          } else {
            throw new Error(`Failed to fetch account: ${response.statusText}`);
          }
        } else {
          accountData = await response.json();
        }
      } catch (error: any) {
        throw new Error(`Failed to fetch account: ${error.message}`);
      }

      console.log(`Account loaded successfully on ${network}`);
      
      const resultBalances: AssetBalance[] = [];
      const assetMap = new Map<string, AssetBalance>();

      // Process all balances
      const accountBalances = (accountData as any).balances || [];
      accountBalances.forEach((balance: any) => {
        console.log('Processing balance:', balance);
        
        if (balance.asset_type === 'native') {
          // XLM
          assetMap.set('XLM', {
            asset: 'XLM',
            balance: balance.balance,
            code: 'XLM',
          });
        } else if (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') {
          // Other assets
          const code = balance.asset_code;
          const assetKey = code.toUpperCase();
          
          // Store all assets
          if (!assetMap.has(assetKey)) {
            assetMap.set(assetKey, {
              asset: assetKey,
              balance: balance.balance,
              code: code,
              issuer: balance.asset_issuer,
            });
          }
        }
      });

      // Convert map to array
      resultBalances.push(...Array.from(assetMap.values()));

      console.log('Fetched balances:', resultBalances);

      // Ensure all expected assets are in the list (with 0 balance if not found)
      const expectedAssets = ['XLM', 'USDC', 'EURC'];
      expectedAssets.forEach(asset => {
        if (!resultBalances.find(b => b.asset === asset)) {
          resultBalances.push({
            asset,
            balance: '0.0000000',
            code: asset,
          });
        }
      });

      const sortedBalances = resultBalances.sort((a, b) => {
        const order = ['XLM', 'USDC', 'EURC'];
        const aIndex = order.indexOf(a.asset);
        const bIndex = order.indexOf(b.asset);
        
        // If both are in the order, sort by order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only one is in order, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // Otherwise sort alphabetically
        return a.asset.localeCompare(b.asset);
      });

      console.log('Final sorted balances:', sortedBalances);
      return sortedBalances;
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      throw new Error(`Failed to fetch balances: ${error.message}`);
    }
  }
}
