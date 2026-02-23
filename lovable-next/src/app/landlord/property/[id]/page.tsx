"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Wallet,
  Calendar,
  IndianRupee,
  QrCode,
  Edit,
  ExternalLink,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ReleaseDialog } from "../../components/ReleaseDialog";
import { EditPropertyDialog } from "../../components/EditPropertyDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const STELLAR_EXPLORER = "https://stellar.expert/explorer/testnet";

interface Property {
  id: string;
  landlord_wallet: string;
  property_name: string;
  deposit_amount: number;
  lease_duration_months: number;
  escrow_address: string;
  created_at: string;
}

interface Lease {
  id: string;
  property_id: string;
  tenant_wallet: string;
  deposit_amount: number;
  deposit_tx_hash: string;
  lease_start_date: string;
  lease_end_date: string;
  status: "active" | "pending_release" | "completed";
  created_at: string;
}

interface Transaction {
  id: string;
  lease_id: string;
  tx_hash: string;
  amount: number;
  type: "deposit" | "refund" | "deduction";
  status: "pending" | "confirmed" | "failed";
  from_address: string;
  to_address: string;
  created_at: string;
  confirmed_at?: string;
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const propertyId = params.id as string;

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    setLoading(true);
    try {
      // Fetch property details
      const propRes = await fetch(
        `${API_URL}/api/properties/${propertyId}/details`,
      );
      if (!propRes.ok) throw new Error("Failed to fetch property");
      const propData = await propRes.json();
      setProperty(propData.property);

      // Fetch leases for this property
      const leasesRes = await fetch(
        `${API_URL}/api/properties/${propertyId}/leases`,
      );
      if (leasesRes.ok) {
        const leasesData = await leasesRes.json();
        setLeases(leasesData.leases || []);
      }

      // Fetch transactions for this property
      const txRes = await fetch(
        `${API_URL}/api/properties/${propertyId}/transactions`,
      );
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
    } catch (error: any) {
      console.error("Error fetching property details:", error);
      toast({
        title: "Error",
        description: "Failed to load property details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Active" },
      pending_release: { variant: "secondary", label: "Pending Release" },
      completed: { variant: "outline", label: "Completed" },
    };
    const config = variants[status] || { variant: "default", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleOpenReleaseDialog = (lease: Lease) => {
    setSelectedLease(lease);
    setReleaseDialogOpen(true);
  };

  const handleReleaseSuccess = () => {
    // Refresh property details after successful release
    fetchPropertyDetails();
  };

  const handleDelete = async () => {
    if (!property) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${API_URL}/api/properties/${property.id}/delete`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete property");
      }

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });

      // Redirect to landlord dashboard
      router.push("/landlord");
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/landlord">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {property.property_name}
            </h1>
            <p className="text-muted-foreground">
              Property details and lease management
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/landlord/property/${propertyId}/qr`}>
              <Button variant="outline" className="gap-2">
                <QrCode className="w-4 h-4" />
                View QR
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <XCircle className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Property Info Card */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Property Information</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {/* Active Leases */}
              <div className="p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Active Leases
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {leases.filter((l) => l.status === "active").length}
                </p>
              </div>

              {/* Total Leases */}
              <div className="p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Total Leases
                  </span>
                </div>
                <p className="text-2xl font-bold">{leases.length}</p>
              </div>
            </div>

            {/* Escrow Address */}
            <div className="mt-4 p-4 bg-background/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Escrow Wallet
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono break-all flex-1">
                  {property.escrow_address}
                </code>
                <Button variant="ghost" size="sm" onClick={handleCopyAddress}>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Leases Table */}
        <Card variant="glass">
          <CardHeader>
            <h2 className="text-2xl font-semibold">Active Leases</h2>
          </CardHeader>
          <CardContent>
            {leases.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Leases Yet</h3>
                <p className="text-muted-foreground">
                  Share your QR code with tenants to start receiving deposits.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leases.map((lease) => {
                      const daysLeft = getDaysRemaining(lease.lease_end_date);
                      return (
                        <TableRow key={lease.id}>
                          <TableCell>
                            <code className="text-xs">
                              {lease.tenant_wallet.slice(0, 8)}...
                              {lease.tenant_wallet.slice(-8)}
                            </code>
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₹{lease.deposit_amount.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              lease.lease_start_date,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              lease.lease_end_date,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                daysLeft < 7
                                  ? "text-red-500 font-semibold"
                                  : daysLeft < 30
                                    ? "text-yellow-500"
                                    : ""
                              }
                            >
                              {daysLeft > 0 ? `${daysLeft} days` : "Expired"}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(lease.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {lease.status === "active" && daysLeft <= 7 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReleaseDialog(lease)}
                                >
                                  Approve Release
                                </Button>
                              )}
                              {lease.status === "active" && daysLeft > 7 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReleaseDialog(lease)}
                                >
                                  Early Release
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card variant="glass">
          <CardHeader>
            <h2 className="text-2xl font-semibold">Transaction History</h2>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <ExternalLink className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  No Transactions Yet
                </h3>
                <p className="text-muted-foreground">
                  Transactions will appear here once deposits are made.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-background/50 rounded-lg hover:bg-background/70 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {getTransactionStatusIcon(tx.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold capitalize">
                            {tx.type}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <code className="text-xs">
                            {tx.tx_hash.slice(0, 8)}...{tx.tx_hash.slice(-8)}
                          </code>
                          <a
                            href={`${STELLAR_EXPLORER}/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ₹{tx.amount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Release Dialog */}
      <ReleaseDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        lease={selectedLease}
        onSuccess={handleReleaseSuccess}
      />

      {/* Edit Property Dialog */}
      {property && (
        <EditPropertyDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          property={{
            id: property.id,
            property_name: property.property_name,
            deposit_amount: property.deposit_amount,
            lease_duration_months: property.lease_duration_months,
            location: null,
            description: null,
            availability_status: "available",
          }}
          onSuccess={fetchPropertyDetails}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              property and all associated data. Properties with active leases
              cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Property"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionWrapper>
  );
}
