"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Filter,
} from "lucide-react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent } from "@/components/Card";
import { cn } from "@/lib/utils";

type TransactionType = "swap" | "payment" | "receive";
type TransactionStatus = "pending" | "completed" | "failed";

interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  asset: string;
  toAmount?: string;
  toAsset?: string;
  address?: string;
  date: string;
  time: string;
  txHash: string;
}

const transactions: Transaction[] = [
  {
    id: "1",
    type: "swap",
    status: "completed",
    amount: "100",
    asset: "XLM",
    toAmount: "12.50",
    toAsset: "USDC",
    date: "Today",
    time: "2:45 PM",
    txHash: "abc123...def",
  },
  {
    id: "2",
    type: "payment",
    status: "completed",
    amount: "50",
    asset: "USDC",
    address: "GCZJ...8HNE",
    date: "Today",
    time: "11:30 AM",
    txHash: "ghi456...jkl",
  },
  {
    id: "3",
    type: "receive",
    status: "completed",
    amount: "200",
    asset: "XLM",
    address: "GBCD...4XYZ",
    date: "Yesterday",
    time: "6:15 PM",
    txHash: "mno789...pqr",
  },
  {
    id: "4",
    type: "swap",
    status: "pending",
    amount: "500",
    asset: "XLM",
    toAmount: "62.00",
    toAsset: "USDC",
    date: "Yesterday",
    time: "3:00 PM",
    txHash: "stu012...vwx",
  },
  {
    id: "5",
    type: "payment",
    status: "failed",
    amount: "25",
    asset: "USDC",
    address: "GHIJ...5ABC",
    date: "Jan 22",
    time: "9:45 AM",
    txHash: "yza345...bcd",
  },
];

const filterOptions: { label: string; value: TransactionType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Swaps", value: "swap" },
  { label: "Sent", value: "payment" },
  { label: "Received", value: "receive" },
];

export default function HistoryPage() {
  const [filter, setFilter] = useState<TransactionType | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === filter);

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case "pending":
        return <span className="status-pending">Pending</span>;
      case "completed":
        return <span className="status-success">Completed</span>;
      case "failed":
        return <span className="status-failed">Failed</span>;
    }
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case "swap":
        return (
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <span className="text-lg">⇄</span>
          </div>
        );
      case "payment":
        return (
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        );
      case "receive":
        return (
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        );
    }
  };

  const getTransactionDescription = (tx: Transaction) => {
    switch (tx.type) {
      case "swap":
        return `${tx.amount} ${tx.asset} → ${tx.toAmount} ${tx.toAsset}`;
      case "payment":
        return `Sent to ${tx.address}`;
      case "receive":
        return `Received from ${tx.address}`;
    }
  };

  const getAmountDisplay = (tx: Transaction) => {
    switch (tx.type) {
      case "swap":
        return (
          <div className="text-right">
            <p className="font-medium">
              -{tx.amount} {tx.asset}
            </p>
            <p className="text-sm text-muted-foreground">
              +{tx.toAmount} {tx.toAsset}
            </p>
          </div>
        );
      case "payment":
        return (
          <p className="font-medium">
            -{tx.amount} {tx.asset}
          </p>
        );
      case "receive":
        return (
          <p className="font-medium">
            +{tx.amount} {tx.asset}
          </p>
        );
    }
  };

  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-1">Transaction History</h1>
              <p className="text-muted-foreground text-sm">
                {filteredTransactions.length} transactions
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2.5 rounded-xl transition-colors",
                showFilters ? "bg-secondary" : "hover:bg-secondary",
              )}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="tab-list w-full mb-6 animate-slide-up">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "tab-trigger flex-1",
                    filter === option.value && "bg-background shadow-sm",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Transactions List */}
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <Card
                  key={tx.id}
                  variant="elevated"
                  className="animate-fade-in hover:border-foreground/20 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {getTypeIcon(tx.type)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium capitalize">{tx.type}</p>
                          {getStatusBadge(tx.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {getTransactionDescription(tx)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tx.date} • {tx.time}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {getAmountDisplay(tx)}
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-secondary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card variant="glass" className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">No transactions found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SectionWrapper>
    </main>
  );
}
