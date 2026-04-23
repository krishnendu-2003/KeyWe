"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ChevronDown,
  Settings,
  Info,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/Card";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/walletContext";
import {
  fetchAccountBalances,
  formatBalance,
  type AssetBalance,
} from "@/lib/balances";
import {
  buildSwapTransaction,
  getQuote,
  submitSwapTransaction,
  type QuoteResponse,
  type SwapRouteHop,
} from "@/lib/api";
import {
  getContractStatus,
  previewSwapWithContract,
  type ContractStatusResponse,
} from "@/lib/contract";
import { signTransaction } from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { toast } from "@/hooks/use-toast";
import { malinton } from "@/app/fonts";

interface Asset {
  code: string;
  name: string;
  icon: string;
}

const assets: Asset[] = [
  { code: "USDC", name: "USD Coin", icon: "" },
  { code: "EURC", name: "Euro Coin", icon: "" },
  { code: "XLM", name: "Stellar Lumens", icon: "" },
];

type SwapState =
  | "idle"
  | "loading"
  | "no-route"
  | "missing-trustline"
  | "ready"
  | "success"
  | "error";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SwapPage() {
  const {
    isConnected,
    publicKey,
    isFreighterInstalled,
    networkDetails,
  } = useWallet();

  const [fromAsset, setFromAsset] = useState<Asset>(assets[0]);
  const [toAsset, setToAsset] = useState<Asset>(assets[1]);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);
  const [swapState, setSwapState] = useState<SwapState>("idle");
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);

  // Refs for click-outside detection
  const fromSelectorRef = useRef<HTMLDivElement>(null);
  const toSelectorRef = useRef<HTMLDivElement>(null);
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractStatus, setContractStatus] =
    useState<ContractStatusResponse | null>(null);
  const [contractPreview, setContractPreview] = useState<string | null>(null);
  const [contractPreviewTxHash, setContractPreviewTxHash] = useState<string | null>(null);
  const [contractPreviewLoading, setContractPreviewLoading] = useState(false);
  const [contractPreviewError, setContractPreviewError] = useState<string | null>(null);

  const handleSwapDirection = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
  };

  const getBalance = useCallback(
    (assetCode: string) => {
      const b = balances.find(
        (x) => x.code === assetCode || x.asset === assetCode,
      );
      return b ? formatBalance(b.balance) : "0.00";
    },
    [balances],
  );

  const parsedAmount = useMemo(() => {
    const raw = amount.replace(/,/g, "").trim();
    const num = Number.parseFloat(raw);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num;
  }, [amount]);

  const estimatedOutput = useMemo(() => {
    if (loadingQuote) return "…";
    if (!quote?.amountOut) return "0.00";
    const out = Number.parseFloat(quote.amountOut) / 10_000_000;
    if (!Number.isFinite(out)) return "0.00";
    return out < 0.01 ? out.toFixed(7) : out.toFixed(2);
  }, [quote, loadingQuote]);

  const contractEstimatedOutput = useMemo(() => {
    if (contractPreviewLoading) return "â€¦";
    if (!contractPreview) return "Unavailable";
    const out = Number.parseFloat(contractPreview) / 10_000_000;
    if (!Number.isFinite(out)) return "Unavailable";
    return out < 0.01 ? out.toFixed(7) : out.toFixed(2);
  }, [contractPreview, contractPreviewLoading]);

  useEffect(() => {
    let cancelled = false;

    getContractStatus()
      .then((status) => {
        if (!cancelled) {
          setContractStatus(status);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setContractStatus(null);
          setContractPreviewError(
            getErrorMessage(e, "Failed to load contract integration status"),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch balances when connected.
  useEffect(() => {
    if (!isConnected || !publicKey) {
      setBalances([]);
      return;
    }
    setLoadingBalances(true);
    setError(null);
    fetchAccountBalances(publicKey, { horizonUrl: networkDetails?.networkUrl })
      .then(setBalances)
      .catch((e: unknown) =>
        setError(getErrorMessage(e, "Failed to fetch balances")),
      )
      .finally(() => setLoadingBalances(false));
  }, [isConnected, publicKey, networkDetails?.networkUrl]);

  const fetchQuote = useCallback(async () => {
    if (!parsedAmount || fromAsset.code === toAsset.code) {
      setQuote(null);
      return;
    }
    setLoadingQuote(true);
    setError(null);
    try {
      const res = await getQuote({
        fromAsset: fromAsset.code,
        toAsset: toAsset.code,
        amount: Math.round(parsedAmount * 10_000_000).toString(),
        slippage: Number.parseFloat(slippage) / 100,
        userPublicKey: publicKey || undefined,
      });
      setQuote(res);
      setSwapState("ready");
    } catch (e: unknown) {
      setQuote(null);
      setSwapState("idle");
      setError(getErrorMessage(e, "Failed to get quote"));
    } finally {
      setLoadingQuote(false);
    }
  }, [fromAsset.code, toAsset.code, parsedAmount, slippage, publicKey]);

  // Debounce quote fetching.
  useEffect(() => {
    const t = setTimeout(() => {
      void fetchQuote();
    }, 500);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  // Clear quote when pair changes.
  useEffect(() => {
    setQuote(null);
    setError(null);
    if (amount) setSwapState("idle");
  }, [amount, fromAsset.code, toAsset.code]);

  useEffect(() => {
    let cancelled = false;

    if (!contractStatus?.configured || !quote?.amountIn || !quote?.route?.length) {
      setContractPreview(null);
      setContractPreviewTxHash(null);
      if (contractStatus?.configured !== false) {
        setContractPreviewError(null);
      }
      setContractPreviewLoading(false);
      return;
    }

    setContractPreviewLoading(true);
    setContractPreviewError(null);

    previewSwapWithContract({
      amount: quote.amountIn,
      hops: quote.route.length,
      contractId: contractStatus.contractId || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setContractPreview(result.estimatedAmountOut);
        setContractPreviewTxHash(result.transactionHash);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setContractPreview(null);
        setContractPreviewTxHash(null);
        setContractPreviewError(
          getErrorMessage(e, "Failed to load contract-backed preview"),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setContractPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    contractStatus?.configured,
    contractStatus?.contractId,
    quote?.amountIn,
    quote?.route?.length,
  ]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fromSelectorRef.current &&
        !fromSelectorRef.current.contains(event.target as Node)
      ) {
        setShowFromSelector(false);
      }
      if (
        toSelectorRef.current &&
        !toSelectorRef.current.contains(event.target as Node)
      ) {
        setShowToSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSwap = async () => {
    setError(null);

    if (!isFreighterInstalled) {
      setError("Freighter wallet extension is not installed.");
      return;
    }

    if (!isConnected) {
      setError("Please connect your wallet first.");
      return;
    }

    if (!publicKey) {
      setError("Wallet is connected but no public key was returned.");
      return;
    }

    if (!parsedAmount) {
      setError("Please enter a valid amount");
      return;
    }

    if (!quote?.route || !quote?.amountIn || !quote?.amountOut) {
      setError("No quote available yet. Enter an amount to fetch a route.");
      return;
    }

    setSwapState("loading");
    try {
      const buildRes = await buildSwapTransaction({
        route: quote.route,
        userPublicKey: publicKey,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        fromAsset: fromAsset.code,
        toAsset: toAsset.code,
        slippage: Number.parseFloat(slippage) / 100,
      });

      const txXdr = buildRes?.transactionXdr;
      if (!txXdr) throw new Error("Failed to build transaction XDR");

      const networkPassphrase =
        buildRes?.networkPassphrase || StellarSdk.Networks.TESTNET;

      const signedXdr = await signTransaction(txXdr, { networkPassphrase });
      if (!signedXdr) throw new Error("Transaction signing was cancelled");

      const submitRes = await submitSwapTransaction(
        signedXdr,
        networkPassphrase,
      );

      setSwapState("success");
      toast({
        title: "Swap executed",
        description: `Tx: ${submitRes?.transactionHash || "submitted"}`,
      });

      // Refresh balances after swap.
      if (publicKey) {
        setTimeout(() => {
          fetchAccountBalances(publicKey, {
            horizonUrl: networkDetails?.networkUrl,
          })
            .then(setBalances)
            .catch(() => {});
    }, 2000);
      }

      // Clear input/quote.
      setAmount("");
      setQuote(null);
      setTimeout(() => setSwapState("idle"), 2500);
    } catch (e: unknown) {
      setSwapState("error");
      setError(getErrorMessage(e, "Swap failed"));
    }
  };

  const getButtonContent = () => {
    switch (swapState) {
      case "loading":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        );
      case "success":
        return (
          <>
            <Check className="w-5 h-5" />
            Swap Complete!
          </>
        );
      case "no-route":
        return "No Route Available";
      case "missing-trustline":
        return "Add Trustline First";
      case "error":
        return "Swap Failed - Retry";
      default:
        if (!isConnected) return "Connect Freighter";
        return amount ? "Swap" : "Enter Amount";
    }
  };

  const canSwap =
    isConnected &&
    !!parsedAmount &&
    !!quote?.route?.length &&
    swapState !== "loading" &&
    swapState !== "success" &&
    !loadingQuote;

  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={cn("text-2xl font-bold", malinton.className)}>Swap</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isConnected && publicKey
                  ? `Connected: ${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`
                  : isFreighterInstalled
                    ? "Connect Freighter to start swapping"
                    : "Install Freighter to connect"}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2.5 rounded-xl transition-colors",
                showSettings ? "bg-secondary" : "hover:bg-secondary",
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {!isConnected && (
            <Card variant="elevated" className="mb-4">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Connect your wallet from the <a className="underline" href="/wallet">Wallet</a> page to start swapping.
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-card flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Something went wrong</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <Card variant="elevated" className="mb-4 animate-slide-up">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Slippage Tolerance
                  </span>
                  <div className="flex items-center gap-2">
                    {["0.5", "1", "2"].map((value) => (
                      <button
                        key={value}
                        onClick={() => setSlippage(value)}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg transition-colors",
                          slippage === value
                            ? "bg-foreground text-background"
                            : "bg-secondary hover:bg-accent",
                        )}
                      >
                        {value}%
                      </button>
                    ))}
                    <input
                      type="text"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      className="w-16 px-3 py-1.5 text-sm rounded-lg bg-secondary text-center focus:outline-none focus:ring-1 focus:ring-foreground"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Swap Card */}
          <Card variant="glass" glowEffect>
            <CardHeader>
              <span className="text-sm text-muted-foreground">You pay</span>
            </CardHeader>

            <CardContent className="space-y-4 overflow-visible">
              {/* From Input */}
              <div className="bg-secondary rounded-xl p-4 relative overflow-visible">
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 min-w-0 text-3xl font-semibold bg-transparent focus:outline-none placeholder:text-muted-foreground"
                  />
                  <div ref={fromSelectorRef} className="relative flex-shrink-0">
                    <button
                      onClick={() => setShowFromSelector(!showFromSelector)}
                      className="asset-selector"
                    >
                      {fromAsset.icon && (
                      <span className="text-xl">{fromAsset.icon}</span>
                      )}
                      <span className="font-medium">{fromAsset.code}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showFromSelector && (
                      <div className="absolute right-0 top-full mt-2 w-48 elevated-card p-2 z-50 animate-scale-in">
                        {assets
                          .filter((a) => a.code !== toAsset.code)
                          .map((asset) => (
                            <button
                              key={asset.code}
                              onClick={() => {
                                setFromAsset(asset);
                                setShowFromSelector(false);
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                            >
                              {asset.icon && (
                              <span className="text-xl">{asset.icon}</span>
                              )}
                              <div className="text-left">
                                <p className="font-medium">{asset.code}</p>
                                <p className="text-xs text-muted-foreground">
                                  {loadingBalances
                                    ? "Loading…"
                                    : `${getBalance(asset.code)} ${asset.code}`}
                                </p>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                  <span>
                    Balance:{" "}
                    {loadingBalances
                      ? "Loading…"
                      : `${getBalance(fromAsset.code)} ${fromAsset.code}`}
                  </span>
                  <button
                    onClick={() => setAmount(getBalance(fromAsset.code))}
                    className="font-medium hover:text-foreground transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Swap Direction Button */}
              <div className="relative flex items-center justify-center -my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <button
                  onClick={handleSwapDirection}
                  className="relative z-10 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors group"
                >
                  <ArrowDownUp className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
              </div>

              {/* To Input */}
              <div className="bg-secondary rounded-xl p-4 relative overflow-visible">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    You receive
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={cn(
                      "flex-1 min-w-0 text-3xl font-semibold",
                      loadingQuote ? "text-muted-foreground" : "",
                    )}
                  >
                    {estimatedOutput}
                  </span>
                  <div ref={toSelectorRef} className="relative flex-shrink-0">
                    <button
                      onClick={() => setShowToSelector(!showToSelector)}
                      className="asset-selector"
                    >
                      {toAsset.icon && (
                      <span className="text-xl">{toAsset.icon}</span>
                      )}
                      <span className="font-medium">{toAsset.code}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showToSelector && (
                      <div className="absolute right-0 top-full mt-2 w-48 elevated-card p-2 z-50 animate-scale-in">
                        {assets
                          .filter((a) => a.code !== fromAsset.code)
                          .map((asset) => (
                            <button
                              key={asset.code}
                              onClick={() => {
                                setToAsset(asset);
                                setShowToSelector(false);
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                            >
                              {asset.icon && (
                              <span className="text-xl">{asset.icon}</span>
                              )}
                              <div className="text-left">
                                <p className="font-medium">{asset.code}</p>
                                <p className="text-xs text-muted-foreground">
                                  {loadingBalances
                                    ? "Loading…"
                                    : `${getBalance(asset.code)} ${asset.code}`}
                                </p>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Route Info */}
              {amount && (
                <div className="rounded-xl border border-border p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      Rate
                    </span>
                    <span>
                      {quote?.amountIn && quote?.amountOut
                        ? (() => {
                            const inAmt =
                              Number.parseFloat(quote.amountIn) / 10_000_000;
                            const outAmt =
                              Number.parseFloat(quote.amountOut) / 10_000_000;
                            if (
                              !Number.isFinite(inAmt) ||
                              !Number.isFinite(outAmt) ||
                              inAmt === 0
                            ) {
                              return `—`;
                            }
                            const rate = outAmt / inAmt;
                            return `1 ${fromAsset.code} = ${rate.toFixed(6)} ${toAsset.code}`;
                          })()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span>
                      {quote?.route?.length
                        ? quote.route
                            .map((hop: SwapRouteHop) => hop.fromAsset)
                            .concat([
                              quote.route[quote.route.length - 1]?.toAsset,
                            ])
                            .filter(Boolean)
                            .join(" → ")
                        : `${fromAsset.code} → ${toAsset.code}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Network Fee</span>
                    <span>~0.00001 XLM</span>
                  </div>
                  <div className="flex items-center justify-between text-sm gap-4">
                    <span className="text-muted-foreground">
                      Soroban Contract Preview
                    </span>
                    <span className="text-right">
                      {!contractStatus
                        ? "Checkingâ€¦"
                        : !contractStatus.configured
                          ? "Not configured"
                          : `${contractEstimatedOutput} ${toAsset.code}`}
                    </span>
                  </div>
                  {contractStatus?.configured && contractPreviewTxHash && (
                    <div className="flex items-center justify-between text-sm gap-4">
                      <span className="text-muted-foreground">Preview Tx</span>
                      <span className="truncate max-w-[12rem] text-right">
                        {contractPreviewTxHash}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Slippage</span>
                    <span>{slippage}%</span>
                  </div>
                  {typeof quote?.priceImpact === "number" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Price Impact
                      </span>
                      <span>{quote.priceImpact.toFixed(2)}%</span>
                    </div>
                  )}
                  {contractStatus?.configured && (
                    <p className="text-xs text-muted-foreground">
                      Contract integration is active via{" "}
                      <code className="font-mono">
                        {contractStatus.contractId || "CONTRACT_ID"}
                      </code>
                      .
                    </p>
                  )}
                  {contractPreviewError && (
                    <p className="text-xs text-muted-foreground">
                      {contractPreviewError}
                    </p>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter>
              <button
                onClick={handleSwap}
                disabled={!canSwap}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                  canSwap
                    ? "bg-foreground text-background hover:opacity-90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed",
                  swapState === "success" && "bg-foreground text-background",
                  swapState === "error" &&
                    "bg-destructive text-destructive-foreground",
                )}
              >
                {getButtonContent()}
              </button>

              {/* Disconnect handled by WalletConnect above */}
            </CardFooter>
          </Card>

          {/* Status Messages */}
          {swapState === "no-route" && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-card flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">No route available</p>
                <p className="text-sm text-muted-foreground">
                  Try a different asset pair or smaller amount.
                </p>
              </div>
            </div>
          )}
        </div>
      </SectionWrapper>
    </main>
  );
}
