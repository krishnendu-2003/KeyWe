// React Native compatible WalletConnect integration
// Avoiding Stellar SDK imports to prevent Node.js module issues

// Replace with your actual WalletConnect Project ID
const WC_PROJECT_ID = '1453a1b1336251a905480d1e603da996';

export class WalletConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletConnectError';
  }
}

class WalletConnectManager {
  private client: any = null;
  private session: any = null;

  async initialize() {
    if (this.client) return this.client;

    try {
      // For now, mock the WalletConnect client to avoid import issues
      this.client = {
        connect: async () => ({
          uri: 'mock://walletconnect-uri',
          approval: async () => ({
            topic: 'mock-topic',
            namespaces: {
              stellar: {
                accounts: ['stellar:testnet:GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX']
              }
            }
          })
        }),
        request: async () => ({
          hash: `mock-tx-hash-${Date.now()}`
        }),
        disconnect: async () => {}
      };

      return this.client;
    } catch (error) {
      throw new WalletConnectError('Failed to initialize WalletConnect');
    }
  }

  async connect() {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { uri, approval } = await this.client.connect({
        requiredNamespaces: {
          stellar: {
            methods: ['stellar_signAndSubmitTransaction', 'stellar_signTransaction'],
            chains: ['stellar:testnet'],
            events: []
          }
        }
      });

      if (uri) {
        // Open Freighter Mobile with the URI
        const freighterUri = `freighter://wc?uri=${encodeURIComponent(uri)}`;
        console.log('Connect URI:', freighterUri);
        // In a real app, you'd use Linking.openURL(freighterUri)
      }

      this.session = await approval();
      return this.session;
    } catch (error) {
      throw new WalletConnectError('Failed to connect to wallet');
    }
  }

  async signAndSubmitTransaction(transaction: any, network: 'testnet' | 'mainnet' = 'testnet') {
    if (!this.client || !this.session) {
      throw new WalletConnectError('Not connected to wallet');
    }

    try {
      const result = await this.client.request({
        topic: this.session.topic,
        chainId: `stellar:${network}`,
        request: {
          method: 'stellar_signAndSubmitTransaction',
          params: {
            xdr: transaction.toXDR(),
            network: network.toUpperCase()
          }
        }
      });

      return result;
    } catch (error) {
      throw new WalletConnectError(
        error instanceof Error ? error.message : 'Transaction signing failed'
      );
    }
  }

  async disconnect() {
    if (this.client && this.session) {
      await this.client.disconnect({
        topic: this.session.topic,
        reason: {
          code: 6000,
          message: 'User disconnected'
        }
      });
      this.session = null;
    }
  }

  isConnected(): boolean {
    return !!this.session;
  }

  getAccountAddress(): string | null {
    if (!this.session) return null;
    
    const stellarAccount = this.session.namespaces?.stellar?.accounts?.[0];
    if (stellarAccount) {
      // Extract address from "stellar:testnet:GXXXXX" format
      return stellarAccount.split(':')[2];
    }
    
    return 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Mock address
  }
}

export const walletConnect = new WalletConnectManager();