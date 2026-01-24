"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getNetworkDetails, getPublicKey, isAllowed, setAllowed } from "@stellar/freighter-api";

interface WalletContextType {
  isConnected: boolean;
  publicKey: string | null;
  isFreighterInstalled: boolean;
  networkDetails: {
    network: string;
    networkUrl: string;
    networkPassphrase: string;
    sorobanRpcUrl?: string;
  } | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [networkDetails, setNetworkDetails] = useState<WalletContextType["networkDetails"]>(null);

  useEffect(() => {
    const detectFreighter = async () => {
      try {
        await isAllowed();
        setIsFreighterInstalled(true);
      } catch {
        setIsFreighterInstalled(false);
      }
    };
    detectFreighter();
  }, []);

  const connect = async () => {
    const allowed = await isAllowed();
    if (!allowed) {
      const approved = await setAllowed();
      if (!approved) throw new Error("User rejected Freighter access");
    }

    const pk = await getPublicKey();
    if (!pk) throw new Error("Failed to retrieve public key");
    setPublicKey(pk);

    // Record the user's selected network (testnet/mainnet) so we can fetch the right balances.
    try {
      const details = await getNetworkDetails();
      setNetworkDetails(details || null);
    } catch {
      setNetworkDetails(null);
    }
  };

  const disconnect = () => {
    // Freighter doesn't support programmatic disconnect; this is app-level only.
    setPublicKey(null);
    setNetworkDetails(null);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!publicKey,
        publicKey,
        isFreighterInstalled,
        networkDetails,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}

