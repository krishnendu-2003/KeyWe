"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Filter,
  ChevronDown,
} from "lucide-react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent } from "@/components/Card";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/walletContext";
import { malinton } from "@/app/fonts";
import {
  assetCodeFromOp,
  explorerNetworkFromHorizonUrl,
  fetchAccountTransactions,
  fetchTransactionOperations,
  type HorizonOperation,
  type HorizonTransaction,
} from "@/lib/history";

type TransactionType = "swap" | "payment" | "receive";
type TransactionStatus = "pending" | "completed" | "failed";

type UiTx = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountPrimary: string;
  amountSecondary?: string;
  address?: string;
  createdAt: string;
  txHash: string;
  raw: HorizonTransaction;
};

const filterOptions: { label: string; value: TransactionType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Swaps", value: "swap" },
  { label: "Sent", value: "payment" },
  { label: "Received", value: "receive" },
];

export default function HistoryPage() {
  const { isConnected, publicKey, networkDetails } = useWallet();
  const [filter, setFilter] = useState<TransactionType | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState<Record<number, UiTx[]>>({});
  const [nextCursorByPage, setNextCursorByPage] = useState<Record<number, string | null>>({});
  const [hasMoreByPage, setHasMoreByPage] = useState<Record<number, boolean>>({});
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [opsByHash, setOpsByHash] = useState<Record<string, HorizonOperation[]>>({});
  const [loadingOps, setLoadingOps] = useState<Record<string, boolean>>({});
  const prefetchedHashesRef = useRef<Set<string>>(new Set());

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

  const horizonUrl = networkDetails?.networkUrl || "https://horizon-testnet.stellar.org";
  const explorerNetwork = explorerNetworkFromHorizonUrl(horizonUrl);

  const fmt3 = (v: any) => {
    const n = Number.parseFloat(String(v ?? ""));
    if (!Number.isFinite(n)) return "0.000";
    return n.toFixed(3);
  };

  const classifyTxFromOps = (ops: HorizonOperation[] | undefined): Partial<Pick<UiTx, "type" | "description" | "amountPrimary" | "amountSecondary" | "address">> => {
    if (!ops?.length || !publicKey) return {};

    const pk = publicKey;
    const paymentLike = ops.find((o) => o.type === "payment" || o.type === "path_payment_strict_send" || o.type === "path_payment_strict_receive");
    if (!paymentLike) return {};

    if (paymentLike.type === "payment") {
      const from = paymentLike.from;
      const to = paymentLike.to;
      const amt = paymentLike.amount;
      const asset = assetCodeFromOp(paymentLike, "asset");
      if (from === pk) {
        return {
          type: "payment",
          address: to,
          description: `Sent to ${to}`,
          amountPrimary: `-${fmt3(amt)} ${asset}`,
        };
      }
      if (to === pk) {
        return {
          type: "receive",
          address: from,
          description: `Received from ${from}`,
          amountPrimary: `+${fmt3(amt)} ${asset}`,
        };
      }
      return {
        type: "payment",
        description: `Payment ${fmt3(amt)} ${asset}`,
        amountPrimary: `${fmt3(amt)} ${asset}`,
      };
    }

    // Path payment = swap-ish for our UI.
    const fromAddr = paymentLike.from || paymentLike.source_account;
    const toAddr = paymentLike.to || paymentLike.to;

    const inAmt = paymentLike.send_amount || paymentLike.source_amount;
    const outAmt = paymentLike.dest_amount || paymentLike.destination_amount;

    const inAsset = paymentLike.send_amount
      ? assetCodeFromOp(paymentLike, "send_asset")
      : assetCodeFromOp(paymentLike, "source_asset");
    const outAsset = paymentLike.dest_amount
      ? assetCodeFromOp(paymentLike, "dest_asset")
      : assetCodeFromOp(paymentLike, "destination_asset");

    return {
      type: "swap",
      address: toAddr,
      description: `${fmt3(inAmt)} ${inAsset} → ${fmt3(outAmt)} ${outAsset}`,
      amountPrimary: `-${fmt3(inAmt)} ${inAsset}`,
      amountSecondary: `+${fmt3(outAmt)} ${outAsset}`,
    };
  };

  const currentPageTxs = useMemo(() => pages[currentPage] || [], [pages, currentPage]);

  const maxLoadedPage = useMemo(() => {
    const nums = Object.keys(pages).map((k) => Number.parseInt(k, 10)).filter((n) => Number.isFinite(n));
    return nums.length ? Math.max(...nums) : 0;
  }, [pages]);

  const canGoPrev = currentPage > 1;
  const canGoNext = !!hasMoreByPage[currentPage] && !!nextCursorByPage[currentPage];

  const updateTxByHash = (hash: string, updater: (t: UiTx) => UiTx) => {
    setPages((prev) => {
      let changed = false;
      const next: Record<number, UiTx[]> = {};
      for (const [k, list] of Object.entries(prev)) {
        const pageNum = Number(k);
        if (!Number.isFinite(pageNum)) continue;
        const idx = list.findIndex((t) => t.txHash === hash);
        if (idx === -1) {
          next[pageNum] = list;
          continue;
        }
        const copy = list.slice();
        copy[idx] = updater(copy[idx]);
        next[pageNum] = copy;
        changed = true;
      }
      return changed ? next : prev;
    });
  };

  const loadPage = async (page: number) => {
    if (!isConnected || !publicKey) return;
    if (pages[page]) return;

    // Ensure we have a cursor from the previous page (sequential paging).
    let cursor: string | undefined;
    if (page > 1) {
      const prevCursor = nextCursorByPage[page - 1];
      if (!prevCursor) return;
      cursor = prevCursor;
    }

    setLoadingTxs(true);
    setError(null);
    try {
      const records = await fetchAccountTransactions({
        horizonUrl,
        publicKey,
        limit: PAGE_SIZE,
        cursor,
      });

      const ui: UiTx[] = records.map((t) => ({
        id: t.id,
        type: "payment",
        status: t.successful ? "completed" : "failed",
        description: `Transaction • ${t.operation_count} ops`,
        amountPrimary: "—",
        createdAt: t.created_at,
        txHash: t.hash,
        raw: t,
      }));

      const nextCursor = records.length ? records[records.length - 1].paging_token : null;
      setPages((p) => ({ ...p, [page]: ui }));
      setNextCursorByPage((p) => ({ ...p, [page]: nextCursor }));
      setHasMoreByPage((p) => ({ ...p, [page]: records.length === PAGE_SIZE }));
    } catch (e: any) {
      setError(e?.message || "Failed to fetch transaction history");
    } finally {
      setLoadingTxs(false);
    }
  };

  useEffect(() => {
    // Reset pagination/cache on wallet/network change.
    setCurrentPage(1);
    setPages({});
    setNextCursorByPage({});
    setHasMoreByPage({});
    setExpanded({});
    prefetchedHashesRef.current = new Set();

    if (!isConnected || !publicKey) return;
    void loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, publicKey, horizonUrl]);

  const filteredTransactions = useMemo(() => {
    const base = filter === "all" ? currentPageTxs : currentPageTxs.filter((t) => t.type === filter);
    return base;
  }, [currentPageTxs, filter]);

  const ensureOpsLoaded = async (hash: string) => {
    if (opsByHash[hash] || loadingOps[hash]) return;
    setLoadingOps((p) => ({ ...p, [hash]: true }));
    try {
      const ops = await fetchTransactionOperations({ horizonUrl, txHash: hash });
      setOpsByHash((p) => ({ ...p, [hash]: ops }));

      // Backfill UI details once we have ops.
      const inferred = classifyTxFromOps(ops);
      updateTxByHash(hash, (t) => ({
        ...t,
        type: inferred.type || t.type,
        description: inferred.description || t.description,
        amountPrimary: inferred.amountPrimary || t.amountPrimary,
        amountSecondary: inferred.amountSecondary || t.amountSecondary,
        address: inferred.address || t.address,
      }));
    } catch (e: any) {
      setError(e?.message || "Failed to load transaction operations");
    } finally {
      setLoadingOps((p) => ({ ...p, [hash]: false }));
    }
  };

  // Prefetch ops for the most recent transactions so the list can show
  // transferred/swapped amounts instead of the fee.
  useEffect(() => {
    if (!isConnected) return;
    const hashes = currentPageTxs.slice(0, 15).map((t) => t.txHash);
    hashes.forEach((h) => {
      if (prefetchedHashesRef.current.has(h)) return;
      prefetchedHashesRef.current.add(h);
      void ensureOpsLoaded(h);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, currentPageTxs]);

  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className={cn("text-2xl font-bold mb-1", malinton.className)}>Transaction History</h1>
              <p className="text-muted-foreground text-sm">
                {loadingTxs ? "Loading…" : `${filteredTransactions.length} transactions • Page ${currentPage}`}
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

          {!isConnected && (
            <Card variant="elevated" className="mb-6">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Connect your wallet from the <a className="underline" href="/wallet">Wallet</a> page to view history.
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card variant="elevated" className="mb-6">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          )}

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
                  onClick={async () => {
                    const next = !expanded[tx.txHash];
                    setExpanded((p) => ({ ...p, [tx.txHash]: next }));
                    if (next) await ensureOpsLoaded(tx.txHash);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {getTypeIcon(tx.type)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium capitalize">{tx.type}</p>
                          {getStatusBadge(tx.status)}
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-muted-foreground transition-transform ml-1",
                              expanded[tx.txHash] ? "rotate-180" : "",
                            )}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {loadingOps[tx.txHash] ? "Loading details…" : tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium">
                            {loadingOps[tx.txHash] ? "…" : tx.amountPrimary}
                          </p>
                          {tx.amountSecondary && (
                            <p className="text-sm text-muted-foreground">{tx.amountSecondary}</p>
                          )}
                        </div>
                        <a
                          href={`https://stellar.expert/explorer/${explorerNetwork}/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-secondary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      </div>
                    </div>

                    {expanded[tx.txHash] && (
                      <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">
                            Hash: <code className="text-foreground break-all">{tx.txHash}</code>
                          </div>
                          <div className="text-muted-foreground">
                            Source:{" "}
                            <code className="text-foreground break-all">{tx.raw.source_account}</code>
                          </div>
                          <div className="text-muted-foreground">
                            Ledger: <span className="text-foreground">{tx.raw.ledger}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Ops: <span className="text-foreground">{tx.raw.operation_count}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Memo:{" "}
                            <span className="text-foreground">
                              {tx.raw.memo_type === "none" ? "—" : tx.raw.memo || tx.raw.memo_type}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Fee charged:{" "}
                            <span className="text-foreground">
                              {(Number(tx.raw.fee_charged) / 10_000_000).toFixed(7)} XLM
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Operations</p>
                          <div className="space-y-2">
                            {(opsByHash[tx.txHash] || []).map((op) => (
                              <div key={op.id} className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-medium">
                                    {op.type}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(op.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap text-muted-foreground">
{JSON.stringify(op, null, 2)}
                                </pre>
                              </div>
                            ))}
                            {!loadingOps[tx.txHash] && (opsByHash[tx.txHash] || []).length === 0 && (
                              <p className="text-sm text-muted-foreground">No operations returned.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card variant="glass" className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">
                  {isConnected ? "No transactions found" : "Connect your wallet to view history"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {isConnected && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!canGoPrev}
                className={cn(
                  "px-3 py-2 rounded-lg border border-border text-sm",
                  canGoPrev ? "hover:bg-secondary" : "opacity-50 cursor-not-allowed",
                )}
              >
                Prev
              </button>

              {Array.from({ length: Math.max(1, maxLoadedPage + (canGoNext ? 1 : 0)) }, (_, i) => i + 1).map(
                (n) => {
                  const isActive = n === currentPage;
                  const isLoaded = !!pages[n];
                  const isNextLoadable = n === maxLoadedPage + 1 && canGoNext;
                  const disabled = !(isLoaded || isNextLoadable);
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={disabled}
                      onClick={async () => {
                        if (n === currentPage) return;
                        if (!pages[n]) {
                          await loadPage(n);
                        }
                        setCurrentPage(n);
                      }}
                      className={cn(
                        "min-w-10 px-3 py-2 rounded-lg border border-border text-sm",
                        isActive ? "bg-foreground text-background" : "hover:bg-secondary",
                        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                      )}
                    >
                      {n}
                    </button>
                  );
                },
              )}

              <button
                type="button"
                onClick={async () => {
                  if (!canGoNext) return;
                  const next = currentPage + 1;
                  if (!pages[next]) await loadPage(next);
                  setCurrentPage(next);
                }}
                disabled={!canGoNext}
                className={cn(
                  "px-3 py-2 rounded-lg border border-border text-sm",
                  canGoNext ? "hover:bg-secondary" : "opacity-50 cursor-not-allowed",
                )}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </SectionWrapper>
    </main>
  );
}
