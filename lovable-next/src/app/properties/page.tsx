"use client";

import { useState, useEffect } from "react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Search,
  Loader2,
  MapPin,
  Calendar,
  IndianRupee,
  User,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { malinton } from "@/app/fonts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface MarketplaceProperty {
  id: string;
  property_name: string;
  deposit_amount: number;
  lease_duration_months: number;
  location: string | null;
  description: string | null;
  landlord_wallet: string;
  escrow_address: string | null;
  availability_status: string;
  active_leases: number;
  created_at: string;
}

export default function MarketplacePage() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<
    MarketplaceProperty[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMarketplaceProperties();
  }, []);

  useEffect(() => {
    // Filter properties based on search query
    if (searchQuery.trim() === "") {
      setFilteredProperties(properties);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = properties.filter(
        (property) =>
          property.property_name.toLowerCase().includes(query) ||
          property.location?.toLowerCase().includes(query) ||
          property.description?.toLowerCase().includes(query),
      );
      setFilteredProperties(filtered);
    }
  }, [searchQuery, properties]);

  const fetchMarketplaceProperties = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/properties/marketplace`);
      if (!response.ok) throw new Error("Failed to fetch properties");

      const data = await response.json();
      setProperties(data.properties || []);
      setFilteredProperties(data.properties || []);
    } catch (error: any) {
      console.error("Error fetching marketplace:", error);
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SectionWrapper className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper className="min-h-screen py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h1
            className={cn(
              "text-4xl sm:text-5xl font-bold mb-4",
              malinton.className,
            )}
          >
            Property Marketplace
          </h1>
          <p className="text-lg text-muted-foreground">
            Browse available rental properties with blockchain-secured deposits
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by property name, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="text-center text-sm text-muted-foreground">
          {filteredProperties.length}{" "}
          {filteredProperties.length === 1 ? "property" : "properties"}{" "}
          available
        </div>

        {/* Property Grid */}
        {filteredProperties.length === 0 ? (
          <Card variant="glass" className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                No Properties Found
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Check back later for new listings"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card
                key={property.id}
                variant="glass"
                glowEffect
                className="hover:scale-105 transition-transform duration-200"
              >
                <CardContent className="p-6">
                  {/* Property Icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>

                  {/* Property Name */}
                  <h3
                    className={cn("text-xl font-bold mb-2", malinton.className)}
                  >
                    {property.property_name}
                  </h3>

                  {/* Location */}
                  {property.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{property.location}</span>
                    </div>
                  )}

                  {/* Description */}
                  {property.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {property.description}
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        Deposit
                      </span>
                      <span className="font-semibold">
                        ₹{property.deposit_amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Duration
                      </span>
                      <span className="font-semibold">
                        {property.lease_duration_months} months
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Landlord
                      </span>
                      <code className="text-xs font-mono">
                        {property.landlord_wallet}
                      </code>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <Link href={`/properties/${property.id}`}>
                    <Button className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
