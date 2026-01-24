"use client";

import { useState } from "react";
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

interface Asset {
  code: string;
  name: string;
  balance: string;
  icon: string;
}

const assets: Asset[] = [
  { code: "XLM", name: "Stellar Lumens", balance: "1,234.56", icon: "⭐" },
  { code: "USDC", name: "USD Coin", balance: "500.00", icon: "💵" },
  { code: "EURC", name: "Euro Coin", balance: "250.00", icon: "💶" },
  { code: "BTC", name: "Bitcoin", balance: "0.0045", icon: "₿" },
];

type SwapState =
  | "idle"
  | "loading"
  | "no-route"
  | "missing-trustline"
  | "ready"
  | "success"
  | "error";

export default function SwapPage() {
  const [fromAsset, setFromAsset] = useState<Asset>(assets[0]);
  const [toAsset, setToAsset] = useState<Asset>(assets[1]);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);
  const [swapState, setSwapState] = useState<SwapState>("idle");
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);

  const handleSwapDirection = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
  };

  const estimatedOutput = amount
    ? (parseFloat(amount.replace(/,/g, "")) * 0.98).toFixed(2)
    : "0.00";

  const handleSwap = () => {
    setSwapState("loading");
    // Simulated swap
    setTimeout(() => {
      setSwapState("success");
      setTimeout(() => setSwapState("idle"), 3000);
    }, 2000);
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
        return amount ? "Swap" : "Enter Amount";
    }
  };

  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Swap</h1>
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

            <CardContent className="space-y-4">
              {/* From Input */}
              <div className="bg-secondary rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 text-3xl font-semibold bg-transparent focus:outline-none placeholder:text-muted-foreground"
                  />
                  <div className="relative">
                    <button
                      onClick={() => setShowFromSelector(!showFromSelector)}
                      className="asset-selector"
                    >
                      <span className="text-xl">{fromAsset.icon}</span>
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
                              <span className="text-xl">{asset.icon}</span>
                              <div className="text-left">
                                <p className="font-medium">{asset.code}</p>
                                <p className="text-xs text-muted-foreground">
                                  {asset.balance}
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
                    Balance: {fromAsset.balance} {fromAsset.code}
                  </span>
                  <button
                    onClick={() =>
                      setAmount(fromAsset.balance.replace(/,/g, ""))
                    }
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
              <div className="bg-secondary rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    You receive
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex-1 text-3xl font-semibold text-muted-foreground">
                    {estimatedOutput}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setShowToSelector(!showToSelector)}
                      className="asset-selector"
                    >
                      <span className="text-xl">{toAsset.icon}</span>
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
                              <span className="text-xl">{asset.icon}</span>
                              <div className="text-left">
                                <p className="font-medium">{asset.code}</p>
                                <p className="text-xs text-muted-foreground">
                                  {asset.balance}
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
                      1 {fromAsset.code} = 0.98 {toAsset.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span>
                      {fromAsset.code} → {toAsset.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Network Fee</span>
                    <span>~0.00001 XLM</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Slippage</span>
                    <span>{slippage}%</span>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <button
                onClick={handleSwap}
                disabled={
                  !amount || swapState === "loading" || swapState === "success"
                }
                className={cn(
                  "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                  amount && swapState !== "loading" && swapState !== "success"
                    ? "bg-foreground text-background hover:opacity-90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed",
                  swapState === "success" && "bg-foreground text-background",
                  swapState === "error" &&
                    "bg-destructive text-destructive-foreground",
                )}
              >
                {getButtonContent()}
              </button>
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
