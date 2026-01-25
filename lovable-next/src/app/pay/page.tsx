"use client";

import { useState } from "react";
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

type Tab = "generate" | "scan";
type ScanState = "idle" | "scanning" | "detected" | "confirming" | "success";

export default function PayPage() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [walletAddress] = useState("GBZX...4GYE");
  const [fullAddress] = useState(
    "GBZX4QDZKGWPK4KQSXCF6QR2JNQKRHM3VVGVPKMQ5ZSQJWKC4GYE",
  );
  const [memo, setMemo] = useState("");
  const [copied, setCopied] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [detectedAddress, setDetectedAddress] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [flashOn, setFlashOn] = useState(false);

  const qrValue = memo ? `${fullAddress}?memo=${memo}` : fullAddress;

  const handleCopy = () => {
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

  const handleStartScan = () => {
    setScanState("scanning");
    // Simulated scan detection
    setTimeout(() => {
      setDetectedAddress("GCZJ...8HNE");
      setScanState("detected");
    }, 2000);
  };

  const handleConfirmPayment = () => {
    setScanState("confirming");
    setTimeout(() => {
      setScanState("success");
      setTimeout(() => {
        setScanState("idle");
        setDetectedAddress("");
        setPaymentAmount("");
      }, 3000);
    }, 2000);
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
              onClick={() => setActiveTab("scan")}
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
                  <QRCodeSVG
                    id="qr-code"
                    value={qrValue}
                    size={200}
                    level="H"
                    includeMargin={false}
                    className="rounded-lg"
                  />
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
                      onClick={handleStartScan}
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
                        if (e.target.value.length > 10) {
                          setDetectedAddress(
                            e.target.value.slice(0, 4) +
                              "..." +
                              e.target.value.slice(-4),
                          );
                          setScanState("detected");
                        }
                      }}
                    />
                  </div>
                )}

                {scanState === "scanning" && (
                  <div className="space-y-6">
                    {/* Simulated camera view */}
                    <div className="relative aspect-square bg-foreground/5 rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-foreground rounded-2xl relative">
                          <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-foreground rounded-tl-lg" />
                          <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-foreground rounded-tr-lg" />
                          <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-foreground rounded-bl-lg" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-foreground rounded-br-lg" />

                          {/* Scanning line animation */}
                          <div className="absolute left-2 right-2 h-0.5 bg-foreground animate-pulse top-1/2 -translate-y-1/2" />
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
                    </div>

                    <button
                      onClick={() => setScanState("idle")}
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
