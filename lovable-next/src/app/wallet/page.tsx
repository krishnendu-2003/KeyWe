"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Check,
  Loader2,
  ExternalLink,
  Copy,
  AlertCircle,
} from "lucide-react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent } from "@/components/Card";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/walletContext";
import { fetchAccountBalances, formatBalance } from "@/lib/balances";
import { explorerNetworkFromHorizonUrl } from "@/lib/history";

type WalletState = "disconnected" | "connecting" | "connected" | "error";

export default function WalletPage() {
  const { isConnected, publicKey, isFreighterInstalled, connect, disconnect, networkDetails } = useWallet();

  const [walletState, setWalletState] = useState<WalletState>("disconnected");
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ asset: string; balance: string }[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const horizonUrl = networkDetails?.networkUrl || (network === "mainnet" ? "https://horizon.stellar.org" : "https://horizon-testnet.stellar.org");
  const explorerNetwork = explorerNetworkFromHorizonUrl(horizonUrl);

  useEffect(() => {
    if (isConnected && publicKey) setWalletState("connected");
    else setWalletState("disconnected");
  }, [isConnected, publicKey]);

  const handleConnect = async () => {
    setError(null);
    if (!isFreighterInstalled) {
      setError("Freighter wallet extension is not installed.");
      setWalletState("error");
      return;
    }

    setWalletState("connecting");
    try {
      await connect();
      setWalletState("connected");
    } catch (e: any) {
      setError(e?.message || "Failed to connect wallet");
      setWalletState("error");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setBalances([]);
    setError(null);
    setWalletState("disconnected");
  };

  const handleCopy = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !publicKey) return;
      setLoadingBalances(true);
      try {
        const b = await fetchAccountBalances(publicKey, { horizonUrl });
        setBalances(b.map((x) => ({ asset: x.asset, balance: x.balance })));
      } catch (e: any) {
        setError(e?.message || "Failed to fetch balances");
      } finally {
        setLoadingBalances(false);
      }
    };
    void run();
  }, [isConnected, publicKey, horizonUrl]);

  const xlmBalance = useMemo(() => {
    const x = balances.find((b) => b.asset === "XLM");
    return x ? formatBalance(x.balance) : "0.00";
  }, [balances]);

  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Wallet</h1>
            <p className="text-muted-foreground">
              Connect your Freighter wallet
            </p>
          </div>

          {/* Disconnected State */}
          {walletState === "disconnected" && (
            <Card variant="glass" glowEffect className="animate-fade-in">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center">
                  <Wallet className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
                  <p className="text-muted-foreground text-sm">
                    Connect your Freighter wallet to start swapping and paying
                    on Stellar.
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  className="w-full btn-fintech-primary"
                  disabled={!isFreighterInstalled}
                >
                  <img
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+"
                    alt="Freighter"
                    className="w-5 h-5 invert dark:invert-0"
                  />
                  Connect Freighter
                </button>

                <p className="text-xs text-muted-foreground">
                  Don't have Freighter?{" "}
                  <a
                    href="https://freighter.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground transition-colors"
                  >
                    Get it here
                  </a>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Connecting State */}
          {walletState === "connecting" && (
            <Card variant="glass" glowEffect className="animate-fade-in">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Connecting...</h3>
                  <p className="text-muted-foreground text-sm">
                    Approve the connection in your Freighter wallet.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connected State */}
          {walletState === "connected" && (
            <div className="space-y-4 animate-fade-in">
              <Card variant="glass" glowEffect>
                <CardContent className="p-6 space-y-6">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <div className="tab-list p-0.5">
                      <button
                        onClick={() => setNetwork("testnet")}
                        className={cn(
                          "px-3 py-1 text-xs rounded-md transition-colors",
                          network === "testnet" && "bg-background shadow-sm",
                        )}
                      >
                        Testnet
                      </button>
                      <button
                        onClick={() => setNetwork("mainnet")}
                        className={cn(
                          "px-3 py-1 text-xs rounded-md transition-colors",
                          network === "mainnet" && "bg-background shadow-sm",
                        )}
                      >
                        Mainnet
                      </button>
                    </div>
                  </div>

                  {/* Wallet Info */}
                  <div className="p-4 bg-secondary rounded-xl">
                    <p className="text-xs text-muted-foreground mb-2">
                      Wallet Address
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono font-medium">
                        {publicKey ? shortenAddress(publicKey) : "—"}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleCopy}
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={`https://stellar.expert/explorer/${explorerNetwork}/account/${publicKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="p-4 bg-secondary rounded-xl">
                    <p className="text-xs text-muted-foreground mb-2">
                      XLM Balance
                    </p>
                    <p className="text-3xl font-bold">
                      {loadingBalances ? "Loading…" : xlmBalance}
                    </p>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="w-full btn-fintech-secondary"
                  >
                    Disconnect
                  </button>
                </CardContent>
              </Card>

              {/* Network Notice */}
              {network === "testnet" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
                  <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">You're on Testnet</p>
                    <p className="text-xs text-muted-foreground">
                      Transactions won't affect real funds.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {walletState === "error" && (
            <Card variant="glass" className="animate-fade-in">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center">
                  <AlertCircle className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Connection Failed
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {error || "Could not connect to Freighter. Make sure it's installed and try again."}
                  </p>
                </div>

                <button
                  onClick={() => setWalletState("disconnected")}
                  className="w-full btn-fintech-primary"
                >
                  Try Again
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </SectionWrapper>
    </main>
  );
}
