"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/walletContext";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Zod validation schema
const propertySchema = z.object({
  property_name: z
    .string()
    .min(3, "Property name must be at least 3 characters")
    .max(100, "Property name must be less than 100 characters"),
  deposit_amount: z
    .number()
    .positive("Deposit amount must be greater than 0")
    .min(1, "Deposit amount must be at least ₹1"),
  lease_duration: z.number().positive("Please select a lease duration"),
  release_conditions: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

export default function CreatePropertyPage() {
  const router = useRouter();
  const { isConnected, publicKey, connect } = useWallet();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      property_name: "",
      deposit_amount: undefined,
      lease_duration: 12,
      release_conditions: "",
    },
  });

  const leaseDuration = watch("lease_duration");

  const onSubmit = async (data: PropertyFormData) => {
    if (!publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        landlord_wallet: publicKey,
        property_name: data.property_name,
        deposit_amount: data.deposit_amount,
        lease_duration: data.lease_duration,
      };

      // Add release conditions if provided
      if (data.release_conditions?.trim()) {
        try {
          payload.release_conditions = JSON.parse(data.release_conditions);
        } catch {
          // If not valid JSON, treat as simple text
          payload.release_conditions = { notes: data.release_conditions };
        }
      }

      const response = await fetch(`${API_URL}/api/properties/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create property");
      }

      const result = await response.json();

      toast({
        title: "Success!",
        description: `Property "${data.property_name}" created successfully.`,
      });

      // Redirect to QR generation page
      router.push(`/landlord/property/${result.property.id}/qr`);
    } catch (error: any) {
      console.error("Error creating property:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
              You need to connect your Freighter wallet to create a property.
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/landlord">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Create New Property</h1>
          <p className="text-muted-foreground">
            Add a new property to manage security deposits and leases
          </p>
        </div>

        {/* Form Card */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Property Details</h2>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Property Name */}
              <div className="space-y-2">
                <Label htmlFor="property_name">
                  Property Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="property_name"
                  placeholder="e.g., Apartment 402, Building A"
                  {...register("property_name")}
                  className={errors.property_name ? "border-destructive" : ""}
                />
                {errors.property_name && (
                  <p className="text-sm text-destructive">
                    {errors.property_name.message}
                  </p>
                )}
              </div>

              {/* Deposit Amount */}
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">
                  Security Deposit <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="deposit_amount"
                    type="number"
                    placeholder="25000"
                    className={`pl-8 ${errors.deposit_amount ? "border-destructive" : ""}`}
                    {...register("deposit_amount", { valueAsNumber: true })}
                    min="1"
                    step="1"
                  />
                </div>
                {errors.deposit_amount && (
                  <p className="text-sm text-destructive">
                    {errors.deposit_amount.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Amount that will be locked in escrow during the lease
                </p>
              </div>

              {/* Lease Duration */}
              <div className="space-y-2">
                <Label htmlFor="lease_duration">
                  Lease Duration <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={leaseDuration?.toString()}
                  onValueChange={(value) =>
                    setValue("lease_duration", parseInt(value))
                  }
                >
                  <SelectTrigger
                    id="lease_duration"
                    className={
                      errors.lease_duration ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="18">18 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
                {errors.lease_duration && (
                  <p className="text-sm text-destructive">
                    {errors.lease_duration.message}
                  </p>
                )}
              </div>

              {/* Release Conditions */}
              <div className="space-y-2">
                <Label htmlFor="release_conditions">
                  Release Conditions{" "}
                  <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                  id="release_conditions"
                  placeholder='e.g., {"cleaning_required": true, "inspection_needed": true} or plain text notes'
                  {...register("release_conditions")}
                  rows={4}
                  className={
                    errors.release_conditions ? "border-destructive" : ""
                  }
                />
                {errors.release_conditions && (
                  <p className="text-sm text-destructive">
                    {errors.release_conditions.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  JSON format or plain text notes about conditions for releasing
                  the deposit
                </p>
              </div>

              {/* Connected Wallet Info */}
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Landlord Wallet</span>
                </div>
                <code className="text-xs font-mono break-all text-muted-foreground">
                  {publicKey}
                </code>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/landlord")}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Property"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card variant="glass" className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> After creating the property, you'll be
              redirected to generate a QR code that tenants can scan to initiate
              the deposit process.
            </p>
          </CardContent>
        </Card>
      </div>
    </SectionWrapper>
  );
}
