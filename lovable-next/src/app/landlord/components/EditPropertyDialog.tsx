"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface EditPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    property_name: string;
    deposit_amount: number;
    lease_duration_months: number;
    location?: string | null;
    description?: string | null;
    availability_status: string;
  };
  onSuccess: () => void;
}

export function EditPropertyDialog({
  open,
  onOpenChange,
  property,
  onSuccess,
}: EditPropertyDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    property_name: property.property_name,
    deposit_amount: property.deposit_amount,
    lease_duration: property.lease_duration_months,
    location: property.location || "",
    description: property.description || "",
    availability_status: property.availability_status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/properties/${property.id}/update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update property");
      }

      toast({
        title: "Success!",
        description: "Property updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
          <DialogDescription>
            Update property details and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Name */}
          <div className="space-y-2">
            <Label htmlFor="property_name">Property Name</Label>
            <Input
              id="property_name"
              value={formData.property_name}
              onChange={(e) =>
                setFormData({ ...formData, property_name: e.target.value })
              }
              required
            />
          </div>

          {/* Deposit Amount */}
          <div className="space-y-2">
            <Label htmlFor="deposit_amount">Security Deposit (₹)</Label>
            <Input
              id="deposit_amount"
              type="number"
              value={formData.deposit_amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  deposit_amount: parseInt(e.target.value),
                })
              }
              required
              min="1"
            />
          </div>

          {/* Lease Duration */}
          <div className="space-y-2">
            <Label htmlFor="lease_duration">Lease Duration</Label>
            <Select
              value={formData.lease_duration.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, lease_duration: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="18">18 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="e.g., Mumbai, Maharashtra"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your property..."
              rows={3}
            />
          </div>

          {/* Availability Status */}
          <div className="space-y-2">
            <Label htmlFor="availability_status">Listing Status</Label>
            <Select
              value={formData.availability_status}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  availability_status: value as
                    | "available"
                    | "occupied"
                    | "unlisted",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available (Listed)</SelectItem>
                <SelectItem value="unlisted">Unlisted (Hidden)</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
