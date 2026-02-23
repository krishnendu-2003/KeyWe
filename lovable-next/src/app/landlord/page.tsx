"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/walletContext";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Building2,
  Wallet,
  Users,
  ExternalLink,
  Loader2,
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
  active_leases_count?: number;
}

export default function LandlordDashboard() {
  const { isConnected, publicKey, connect } = useWallet();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch properties when wallet connects
  useEffect(() => {
    if (isConnected && publicKey) {
      fetchProperties();
    }
  }, [isConnected, publicKey]);

  const fetchProperties = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/properties/${publicKey}`);
      if (!response.ok) throw new Error("Failed to fetch properties");

      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error: any) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If wallet not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full" variant="glass">
          <CardContent className="text-center py-12 px-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-8">
              You need to connect your Freighter wallet to access the landlord
              dashboard and manage your properties.
            </p>
            <Link href="/wallet">
              <Button size="lg" className="w-full gap-2">
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Don't have Freighter?{" "}
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Install it here
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SectionWrapper className="min-h-screen py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Property Management</h1>
            <p className="text-muted-foreground">
              Manage your properties and security deposits
            </p>
          </div>

          <Link href="/landlord/create">
            <Button size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Create Property
            </Button>
          </Link>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : properties.length === 0 ? (
          <Card variant="glass" className="text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first property to start managing security deposits.
              </p>
              <Link href="/landlord/create">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Property
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/landlord/property/${property.id}`}
                className="block"
              >
                <Card
                  variant="glass"
                  glowEffect
                  className="h-full hover:scale-105 transition-transform duration-200 cursor-pointer"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">
                          {property.property_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Created{" "}
                          {new Date(property.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Deposit Amount */}
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        Deposit
                      </span>
                      <span className="text-lg font-bold">
                        ₹{property.deposit_amount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Lease Duration */}
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        Duration
                      </span>
                      <span className="font-semibold">
                        {property.lease_duration_months} months
                      </span>
                    </div>

                    {/* Active Leases */}
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Active Leases:
                      </span>
                      <span className="font-semibold ml-auto">
                        {property.active_leases_count || 0}
                      </span>
                    </div>

                    {/* Escrow Wallet */}
                    <div className="p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Escrow
                        </span>
                      </div>
                      <code className="text-xs font-mono break-all">
                        {property.escrow_address}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
