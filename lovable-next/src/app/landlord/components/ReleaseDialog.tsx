"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/walletContext";
import { signTransaction } from "@stellar/freighter-api";
import {
  IndianRupee,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Upload,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Lease {
  id: string;
  tenant_wallet: string;
  deposit_amount: number;
  lease_start_date: string;
  lease_end_date: string;
  status: string;
}

interface ReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: Lease | null;
  onSuccess?: () => void;
}

export function ReleaseDialog({
  open,
  onOpenChange,
  lease,
  onSuccess,
}: ReleaseDialogProps) {
  const { toast } = useToast();
  const { publicKey, networkDetails } = useWallet();
  const [deductionAmount, setDeductionAmount] = useState("");
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setDeductionAmount("");
      setReason("");
      setPhotos([]);
    }
  }, [open]);

  if (!lease) return null;

  const deduction = parseFloat(deductionAmount) || 0;
  const refundAmount = lease.deposit_amount - deduction;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files].slice(0, 5)); // Max 5 photos
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApprove = async () => {
    // Validation
    if (deduction < 0) {
      toast({
        title: "Invalid Deduction",
        description: "Deduction amount cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    if (deduction > lease.deposit_amount) {
      toast({
        title: "Invalid Deduction",
        description: "Deduction cannot exceed the deposit amount.",
        variant: "destructive",
      });
      return;
    }

    if (deduction > 0 && !reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the deduction.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Call approve endpoint to get signed XDR
      const approveRes = await fetch(`${API_URL}/api/release/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lease_id: lease.id,
          deduction_amount: deduction,
          reason: reason.trim() || undefined,
        }),
      });

      if (!approveRes.ok) {
        const error = await approveRes.json();
        throw new Error(error.error || "Failed to approve release");
      }

      const approveData = await approveRes.json();
      const { xdr } = approveData.transaction;

      // Step 2: Sign transaction with Freighter
      console.log("📝 Signing transaction with Freighter...");
      const signedXdr = await signTransaction(xdr, {
        networkPassphrase:
          networkDetails?.networkPassphrase ||
          "Test SDF Network ; September 2015",
      });

      if (!signedXdr) {
        throw new Error("Transaction signing was cancelled");
      }

      // Step 3: Execute release
      const executeRes = await fetch(`${API_URL}/api/release/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signed_xdr: signedXdr,
          lease_id: lease.id,
        }),
      });

      if (!executeRes.ok) {
        const error = await executeRes.json();
        throw new Error(error.error || "Failed to execute release");
      }

      const executeData = await executeRes.json();

      toast({
        title: "Release Approved!",
        description: `Successfully released ₹${refundAmount.toLocaleString("en-IN")} to tenant.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error approving release:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to approve release. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Approve Deposit Release</DialogTitle>
          <DialogDescription>
            Review the lease details and approve the deposit release to the
            tenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lease Summary */}
          <div className="p-4 bg-background/50 rounded-lg space-y-3">
            <h3 className="font-semibold mb-2">Lease Summary</h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Tenant Address</span>
                <p className="font-mono text-xs mt-1">
                  {lease.tenant_wallet.slice(0, 12)}...
                  {lease.tenant_wallet.slice(-12)}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground">Original Deposit</span>
                <p className="font-semibold mt-1">
                  ₹{lease.deposit_amount.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground">Lease Start</span>
                <p className="mt-1">
                  {new Date(lease.lease_start_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground">Lease End</span>
                <p className="mt-1">
                  {new Date(lease.lease_end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Deduction Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="deduction">Deduction Amount (Optional)</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="deduction"
                  type="number"
                  placeholder="0"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  className="pl-8"
                  min="0"
                  max={lease.deposit_amount}
                  step="1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter amount to deduct from deposit (leave 0 for full refund)
              </p>
            </div>

            {deduction > 0 && (
              <>
                <div>
                  <Label htmlFor="reason">
                    Reason for Deduction{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Damage to wall paint, missing furniture, cleaning required..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="photos">
                    Upload Damage Photos (Optional)
                  </Label>
                  <div className="mt-2">
                    <label
                      htmlFor="photos"
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-background/50 cursor-pointer transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload photos (max 5)
                      </span>
                      <input
                        id="photos"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {photos.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {photos.map((photo, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-background/50 rounded-lg"
                          >
                            <span className="text-sm truncate flex-1">
                              {photo.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePhoto(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Refund Calculation */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Refund Calculation
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Deposit:</span>
                <span className="font-semibold">
                  ₹{lease.deposit_amount.toLocaleString("en-IN")}
                </span>
              </div>

              {deduction > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Deduction:</span>
                  <span className="font-semibold">
                    - ₹{deduction.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="h-px bg-border my-2" />

              <div className="flex justify-between text-lg">
                <span className="font-semibold">Refund to Tenant:</span>
                <span className="font-bold text-primary">
                  ₹{refundAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Warning for deductions */}
          {deduction > 0 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-700 dark:text-yellow-500">
                  Deduction Notice
                </p>
                <p className="text-muted-foreground mt-1">
                  The tenant will be notified of the deduction and reason. Make
                  sure to provide clear justification.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Release
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
