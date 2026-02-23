"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Wallet,
  Calendar,
  IndianRupee,
  MapPin,
  Loader2,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/walletContext";
import { cn } from "@/lib/utils";
import { malinton } from "@/app/fonts";
import QRCode from "qrcode";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface PropertyDetails {
  id: string;
  property_name: string;
  deposit_amount: number;
  lease_duration_months: number;
  location: string | null;
  description: string | null;
  landlord_wallet: string;
  escrow_address: string | null;
  availability_status: string;
  release_conditions: any;
  created_at: string;
}

export default function PublicPropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isConnected, publicKey } = useWallet();

  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQR, setShowQR] = useState(false);

  const propertyId = params.id as string;

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/properties/${propertyId}/public`,
      );
      if (!response.ok) throw new Error("Failed to fetch property");

      const data = await response.json();
      setProperty(data.property);
      setStats(data.stats);
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

  const handleGenerateQR = async () => {
    if (!property?.escrow_address) {
      toast({
        title: "Error",
        description: "Escrow address not available",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate QR code for the escrow address
      const qrData = JSON.stringify({
        destination: property.escrow_address,
        asset_code: "DEPOSIT_INR",
        amount: property.deposit_amount.toString(),
        memo: `Deposit for ${property.property_name}`,
      });

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
      });

      setQrCodeUrl(qrUrl);
      setShowQR(true);
    } catch (error) {
      console.error("Error generating QR:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <SectionWrapper className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <Link href="/properties">
              <Button>Back to Marketplace</Button>
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
        <Link href="/properties">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Button>
        </Link>

        {/* Property Header */}
        <div>
          <h1 className={cn("text-4xl font-bold mb-2", malinton.className)}>
            {property.property_name}
          </h1>
          {property.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span>{property.location}</span>
            </div>
          )}
        </div>

        {/* Availability Badge */}
        <div>
          {stats?.is_available ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Available</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <span className="font-medium">Occupied</span>
            </div>
          )}
        </div>

        {/* Property Details Card */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Property Details</h2>
            </div>
          </CardHeader>
          <CardContent>
            {property.description && (
              <p className="text-muted-foreground mb-6">
                {property.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deposit Amount */}
              <div className="p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <IndianRupee className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Security Deposit
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  ₹{property.deposit_amount.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Lease Duration */}
              <div className="p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Lease Duration
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {property.lease_duration_months} months
                </p>
              </div>
            </div>

            {/* Landlord Info */}
            <div className="mt-4 p-4 bg-background/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Landlord Wallet
                </span>
              </div>
              <code className="text-sm font-mono break-all">
                {property.landlord_wallet}
              </code>
            </div>

            {/* Escrow Address */}
            {property.escrow_address && (
              <div className="mt-4 p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Escrow Address
                  </span>
                </div>
                <code className="text-sm font-mono break-all">
                  {property.escrow_address}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Section */}
        {showQR && qrCodeUrl && (
          <Card variant="glass">
            <CardHeader>
              <h2 className="text-2xl font-semibold">Payment QR Code</h2>
            </CardHeader>
            <CardContent className="text-center">
              <img
                src={qrCodeUrl}
                alt="Payment QR Code"
                className="mx-auto mb-4"
              />
              <p className="text-sm text-muted-foreground">
                Scan this QR code to pay the deposit
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {stats?.is_available && (
          <Card variant="glass" className="bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">
                  Ready to rent this property?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Pay the security deposit to initiate the lease
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    onClick={handleGenerateQR}
                    className="gap-2"
                  >
                    <QrCode className="w-5 h-5" />
                    Generate QR Code
                  </Button>
                  {!isConnected && (
                    <Link href="/wallet">
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2 w-full sm:w-auto"
                      >
                        <Wallet className="w-5 h-5" />
                        Connect Wallet
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SectionWrapper>
  );
}
