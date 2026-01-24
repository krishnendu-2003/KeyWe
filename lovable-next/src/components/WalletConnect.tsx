"use client";

import { useState } from "react";
import { useWallet } from "@/lib/walletContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function WalletConnect({ className }: { className?: string }) {
  const { isConnected, publicKey, isFreighterInstalled, connect, disconnect, networkDetails } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
      toast({ title: "Disconnected" });
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await connect();
      toast({
        title: "Wallet connected",
        description: publicKey ? `Connected: ${publicKey}` : undefined,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Wallet</h2>
          {isConnected ? (
            <div className="text-sm text-muted-foreground mt-1">
              <div className="truncate">
                Connected: <code className="font-mono">{publicKey}</code>
              </div>
              {networkDetails?.network && (
                <div className="mt-1">
                  Network: <span className="font-medium">{networkDetails.network}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {isFreighterInstalled
                ? "Connect Freighter to start swapping"
                : "Install Freighter wallet to connect"}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleConnect}
          disabled={loading || (!isConnected && !isFreighterInstalled)}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 shrink-0",
            isConnected
              ? "bg-destructive text-destructive-foreground hover:opacity-90"
              : "bg-foreground text-background hover:opacity-90",
          )}
        >
          {loading ? "Connecting..." : isConnected ? "Disconnect" : "Connect Freighter"}
        </button>
      </div>

      {!isFreighterInstalled && (
        <div className="mt-3 text-sm text-muted-foreground">
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Install Freighter →
          </a>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-lg border border-border bg-secondary">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

