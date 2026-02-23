"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Download,
  Share2,
  Printer,
  Copy,
  Check,
  Building2,
  Wallet,
  Calendar,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Property {
  id: string;
  landlord_wallet: string;
  property_name: string;
  deposit_amount: number;
  lease_duration_months: number;
  escrow_address: string;
  created_at: string;
}

export default function PropertyQRPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrPayload, setQrPayload] = useState("");

  const propertyId = params.id as string;

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/properties/${propertyId}/details`,
      );
      if (!response.ok) throw new Error("Failed to fetch property");

      const data = await response.json();
      setProperty(data.property);

      // Generate QR payload
      const payload = `stellar:${data.property.escrow_address}?asset=DEPOSIT_INR&amount=${data.property.deposit_amount}&lease=${data.property.lease_duration_months}&property=${encodeURIComponent(data.property.property_name)}&issuer=${process.env.NEXT_PUBLIC_DEPOSIT_ISSUER || ""}`;
      setQrPayload(payload);
    } catch (error: any) {
      console.error("Error fetching property:", error);
      toast({
        title: "Error",
        description: "Failed to load property details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${property?.property_name || "property"}-qr-code.png`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Downloaded!",
          description: "QR code saved to your downloads.",
        });
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleShare = async () => {
    if (!qrPayload) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property?.property_name} - Deposit QR`,
          text: `Scan this QR code to pay security deposit for ${property?.property_name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Share this link with tenants.",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyAddress = () => {
    if (!property?.escrow_address) return;

    navigator.clipboard.writeText(property.escrow_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Copied!",
      description: "Escrow address copied to clipboard.",
    });
  };

  if (loading) {
    return (
      <SectionWrapper className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </SectionWrapper>
    );
  }

  if (!property) {
    return (
      <SectionWrapper className="min-h-screen flex items-center justify-center">
        <Card variant="glass" className="max-w-md">
          <CardContent className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The property you're looking for doesn't exist.
            </p>
            <Link href="/landlord">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/landlord">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Deposit QR Code</h1>
          <p className="text-muted-foreground">
            Share this QR code with tenants to receive security deposits
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Card */}
          <Card variant="glass" className="print:shadow-none">
            <CardHeader>
              <h2 className="text-2xl font-semibold">Scan to Pay Deposit</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div
                ref={qrRef}
                className="bg-white p-8 rounded-2xl flex items-center justify-center"
              >
                <QRCodeSVG
                  value={qrPayload}
                  size={280}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "/favicon.ico",
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 print:hidden">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Instructions:</strong> Tenants can scan this QR code
                  with their Stellar wallet app to initiate the deposit payment.
                  The deposit will be securely held in escrow.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Property Details Card */}
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-semibold">Property Details</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Property Name */}
                <div>
                  <label className="text-sm text-muted-foreground">
                    Property Name
                  </label>
                  <p className="text-lg font-semibold">
                    {property.property_name}
                  </p>
                </div>

                {/* Deposit Amount */}
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Security Deposit
                    </span>
                  </div>
                  <span className="text-2xl font-bold">
                    ₹{property.deposit_amount.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Lease Duration */}
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Lease Duration
                    </span>
                  </div>
                  <span className="text-lg font-semibold">
                    {property.lease_duration_months} months
                  </span>
                </div>

                {/* Escrow Address */}
                <div className="p-4 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Escrow Wallet
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono break-all flex-1">
                      {property.escrow_address}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Created Date */}
                <div className="text-sm text-muted-foreground">
                  Created on{" "}
                  {new Date(property.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card variant="glass" className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="py-4">
                <h3 className="font-semibold mb-2">How it works</h3>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Share this QR code with your tenant</li>
                  <li>2. Tenant scans with Stellar wallet (e.g., Freighter)</li>
                  <li>3. Deposit is locked in escrow automatically</li>
                  <li>4. You can release it when lease ends</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </SectionWrapper>
  );
}
