"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/Card";
import {
  QrCode,
  Scan,
  Copy,
  Check,
  Download,
  Share2,
  Camera,
  Flashlight,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { malinton } from "@/app/fonts";
import { useWallet } from "@/lib/walletContext";
import { signTransaction } from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

type Tab = "generate" | "scan";
type ScanState = "idle" | "scanning" | "detected" | "confirming" | "success";

export default function PayPage() {
  const { isConnected, publicKey, networkDetails } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const fullAddress = publicKey || "";
  const walletAddress = publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : "—";
  const [memo, setMemo] = useState("");
  const [copied, setCopied] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [detectedAddress, setDetectedAddress] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [flashOn, setFlashOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopActiveRef = useRef(false);

  const qrValue = fullAddress ? (memo ? `${fullAddress}?memo=${memo}` : fullAddress) : "";

  const canUseBarcodeDetector = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "BarcodeDetector" in window;
  }, []);

  const parseQrPayload = (raw: string): { address: string; memo?: string } | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // 1) Plain Stellar address
    if (/^G[A-Z2-7]{55}$/i.test(trimmed)) {
      return { address: trimmed };
    }

    // 2) "G...?...": address + optional query (our generated QR is address?memo=...)
    const maybeAddr = trimmed.split("?")[0];
    if (/^G[A-Z2-7]{55}$/i.test(maybeAddr)) {
      const query = trimmed.includes("?") ? trimmed.slice(trimmed.indexOf("?") + 1) : "";
      const params = new URLSearchParams(query);
      const memoVal = params.get("memo") || undefined;
      return { address: maybeAddr, memo: memoVal };
    }

    // 3) web+stellar: or URL formats
    // e.g. web+stellar:pay?destination=G...&memo=...
    try {
      const url = new URL(trimmed);
      const destination = url.searchParams.get("destination") || url.searchParams.get("account_id");
      if (destination && /^G[A-Z2-7]{55}$/i.test(destination)) {
        const memoVal = url.searchParams.get("memo") || undefined;
        return { address: destination, memo: memoVal };
      }
    } catch {
      // ignore
    }

    // Handle web+stellar:pay?... without URL base
    if (trimmed.startsWith("web+stellar:")) {
      const after = trimmed.replace(/^web\+stellar:/, "");
      const qIndex = after.indexOf("?");
      const query = qIndex >= 0 ? after.slice(qIndex + 1) : "";
      const params = new URLSearchParams(query);
      const destination = params.get("destination") || params.get("account_id") || "";
      if (destination && /^G[A-Z2-7]{55}$/i.test(destination)) {
        const memoVal = params.get("memo") || undefined;
        return { address: destination, memo: memoVal };
      }
    }

    return null;
  };

  const handleCopy = () => {
    if (!fullAddress) return;
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const link = document.createElement("a");
        link.download = "keywe-qr.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  const stopCamera = () => {
    scanLoopActiveRef.current = false;
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    if (videoRef.current) {
      (videoRef.current as any).srcObject = null;
    }
  };

  const startScan = () => {
    setCameraError(null);
    setDetectedAddress("");
    setPaymentAmount("");
    setScanState("scanning");
  };

  // Start/stop camera automatically based on scan state / tab.
  useEffect(() => {
    const shouldRun = activeTab === "scan" && scanState === "scanning";
    if (!shouldRun) {
      stopCamera();
      return;
    }

    let cancelled = false;
    scanLoopActiveRef.current = true;

    const run = async () => {
      if (typeof window === "undefined") return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not available in this browser.");
        setScanState("idle");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        (video as any).srcObject = stream;
        await video.play();

        if (!canUseBarcodeDetector) {
          setCameraError("QR scanning is not supported in this browser. Try Chrome, or paste the address below.");
          return;
        }

        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled || !scanLoopActiveRef.current) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const raw = codes?.[0]?.rawValue;
              if (raw) {
                const parsed = parseQrPayload(String(raw));
                if (parsed?.address) {
                  setDetectedAddress(parsed.address);
                  if (parsed.memo) setMemo(parsed.memo);
                  setScanState("detected");
                  stopCamera();
                  return;
                }
              }
            }
          } catch {
            // ignore transient detector errors
          }
          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      } catch (e: any) {
        setCameraError(e?.message || "Failed to open camera. Check browser permissions.");
        setScanState("idle");
      }
    };

    void run();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, scanState, canUseBarcodeDetector]);

  const handleConfirmPayment = async () => {
    setPaymentError(null);
    setPaymentTxHash(null);

    if (!isConnected || !publicKey) {
      setPaymentError("Connect your wallet from /wallet first.");
      return;
    }
    if (!detectedAddress || !/^G[A-Z2-7]{55}$/i.test(detectedAddress)) {
      setPaymentError("Invalid destination address.");
      return;
    }
    const amt = Number.parseFloat(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setPaymentError("Enter a valid amount.");
      return;
    }

    const horizonUrl = networkDetails?.networkUrl || "https://horizon-testnet.stellar.org";
    const networkPassphrase = networkDetails?.networkPassphrase || StellarSdk.Networks.TESTNET;

    setScanState("confirming");
    try {
      // 1) Load account (sequence)
      const accountRes = await fetch(`${horizonUrl.replace(/\/$/, "")}/accounts/${publicKey}`);
      if (!accountRes.ok) throw new Error("Failed to load sender account from Horizon");
      const accountData: any = await accountRes.json();
      const account = new StellarSdk.Account(publicKey, String(accountData.sequence));

      // 2) Build payment tx (XLM)
      const fee = String(StellarSdk.BASE_FEE || 100);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee,
        networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: detectedAddress,
            asset: StellarSdk.Asset.native(),
            amount: amt.toFixed(7), // Horizon requires string decimal; Stellar uses 7 decimals
          }),
        )
        .setTimeout(180)
        .build();

      // 3) Sign via Freighter
      const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase });
      if (!signedXdr) throw new Error("Signing was cancelled");

      // 4) Submit to Horizon
      const submitRes = await fetch(`${horizonUrl.replace(/\/$/, "")}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ tx: signedXdr }),
      });
      const submitJson: any = await submitRes.json().catch(() => ({}));
      if (!submitRes.ok) {
        const msg =
          submitJson?.extras?.result_codes?.transaction ||
          submitJson?.detail ||
          "Transaction failed";
        throw new Error(msg);
      }

      setPaymentTxHash(String(submitJson?.hash || ""));
      setScanState("success");
      setTimeout(() => {
        setScanState("idle");
        setDetectedAddress("");
        setPaymentAmount("");
        setPaymentTxHash(null);
        setPaymentError(null);
      }, 3500);
    } catch (e: any) {
      setPaymentError(e?.message || "Failed to send payment");
      setScanState("detected");
    }
  };

  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
                <h1 className={cn("text-2xl font-bold mb-2", malinton.className)}>QR Payments</h1>
            <p className="text-muted-foreground">
              Generate or scan to pay instantly
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="tab-list w-full mb-6">
            <button
              onClick={() => setActiveTab("generate")}
              className={cn(
                "tab-trigger flex-1 flex items-center justify-center gap-2",
                activeTab === "generate" && "bg-background shadow-sm",
              )}
            >
              <QrCode className="w-4 h-4" />
              Generate
            </button>
            <button
              onClick={() => {
                setActiveTab("scan");
                startScan();
              }}
              className={cn(
                "tab-trigger flex-1 flex items-center justify-center gap-2",
                activeTab === "scan" && "bg-background shadow-sm",
              )}
            >
              <Scan className="w-4 h-4" />
              Scan & Pay
            </button>
          </div>

          {/* Generate Tab */}
          {activeTab === "generate" && (
            <Card variant="glass" glowEffect className="animate-fade-in">
              <CardHeader className="text-center">
                <p className="text-sm text-muted-foreground">
                  Your Wallet QR Code
                </p>
              </CardHeader>

              <CardContent className="flex flex-col items-center space-y-6">
                {/* QR Code */}
                <div className="p-6 bg-background rounded-2xl">
                  {fullAddress ? (
                    <QRCodeSVG
                      id="qr-code"
                      value={qrValue}
                      size={200}
                      level="H"
                      includeMargin={false}
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] rounded-lg border border-border flex items-center justify-center text-center text-sm text-muted-foreground p-4">
                      Connect your wallet on{" "}
                      <a className="underline" href="/wallet">
                        Wallet
                      </a>{" "}
                      to generate your QR
                    </div>
                  )}
                </div>

                {/* Address Display */}
                <div className="w-full">
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Wallet Address
                      </p>
                      <p className="font-mono font-medium">{walletAddress}</p>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="p-2.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      {copied ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Optional Memo */}
                <div className="w-full">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Optional Memo
                  </label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Add a memo..."
                    className="input-fintech text-base"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 btn-fintech-secondary"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button className="flex-1 btn-fintech-primary">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </CardFooter>
            </Card>
          )}

          {/* Scan Tab */}
          {activeTab === "scan" && (
            <Card variant="glass" glowEffect className="animate-fade-in">
              <CardContent className="p-6">
                {scanState === "idle" && (
                  <div className="text-center space-y-6">
                    <div className="w-24 h-24 mx-auto rounded-2xl bg-secondary flex items-center justify-center">
                      <Camera className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Scan QR to Pay
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Point your camera at a KeyWe QR code to send a payment
                      </p>
                    </div>
                    <button
                      onClick={startScan}
                      className="w-full btn-fintech-primary"
                    >
                      <Camera className="w-5 h-5" />
                      Open Camera
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-4 bg-card text-muted-foreground">
                          or
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Paste wallet address..."
                      className="input-fintech text-center"
                      onChange={(e) => {
                        const parsed = parseQrPayload(e.target.value);
                        if (parsed?.address) {
                          setDetectedAddress(parsed.address);
                          if (parsed.memo) setMemo(parsed.memo);
                          setScanState("detected");
                        }
                      }}
                    />
                  </div>
                )}

                {scanState === "scanning" && (
                  <div className="space-y-6">
                    {/* Camera view */}
                    <div className="relative aspect-square bg-foreground/5 rounded-2xl overflow-hidden">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Scan frame overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-background/80 rounded-2xl relative">
                          <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-background/80 rounded-tl-lg" />
                          <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-background/80 rounded-tr-lg" />
                          <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-background/80 rounded-bl-lg" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-background/80 rounded-br-lg" />
                          <div className="absolute left-2 right-2 h-0.5 bg-background/80 animate-pulse top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                        <button
                          onClick={() => setFlashOn(!flashOn)}
                          className={cn(
                            "p-3 rounded-full transition-colors",
                            flashOn
                              ? "bg-foreground text-background"
                              : "bg-background/80",
                          )}
                        >
                          <Flashlight className="w-5 h-5" />
                        </button>
                      </div>

                      {cameraError && (
                        <div className="absolute top-3 left-3 right-3 rounded-xl bg-background/90 border border-border p-3 text-sm">
                          {cameraError}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        stopCamera();
                        setScanState("idle");
                      }}
                      className="w-full btn-fintech-secondary"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}

                {(scanState === "detected" || scanState === "confirming") && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Check className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">
                        Address Detected
                      </h3>
                      <p className="font-mono text-muted-foreground">
                        {detectedAddress}
                      </p>
                    </div>

                    {paymentError && (
                      <div className="p-3 rounded-xl border border-border bg-secondary text-sm">
                        {paymentError}
                      </div>
                    )}

                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Amount to Send
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                          className="input-fintech flex-1 text-2xl text-center"
                        />
                        <span className="text-lg font-medium text-muted-foreground">
                          XLM
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmPayment}
                      disabled={!paymentAmount || scanState === "confirming"}
                      className={cn(
                        "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                        paymentAmount
                          ? "bg-foreground text-background hover:opacity-90"
                          : "bg-secondary text-muted-foreground cursor-not-allowed",
                      )}
                    >
                      {scanState === "confirming" ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Confirm Payment
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setScanState("idle");
                        setDetectedAddress("");
                        setPaymentAmount("");
                      }}
                      className="w-full btn-fintech-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {scanState === "success" && (
                  <div className="text-center space-y-6 animate-fade-in">
                    <div className="w-20 h-20 mx-auto rounded-full bg-foreground flex items-center justify-center">
                      <Check className="w-10 h-10 text-background" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        Payment Sent!
                      </h3>
                      <p className="text-muted-foreground">
                        {paymentAmount} XLM sent to {detectedAddress}
                      </p>
                      {paymentTxHash && (
                        <p className="text-xs text-muted-foreground mt-2 break-all">
                          Tx: {paymentTxHash}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SectionWrapper>
    </main>
  );
}
