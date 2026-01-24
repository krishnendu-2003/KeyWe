export type PendingSwapStatus = "created" | "signed" | "submitted" | "cancelled";

export interface PendingSwap {
  id: string;
  createdAt: number;
  status: PendingSwapStatus;
  unsignedTransactionXdr: string;
  networkPassphrase: string;
  signedTransactionXdr?: string;
  transactionHash?: string;
  error?: string;
}

// Simple in-memory store (dev/demo only). Restarts wipe all pending items.
const store = new Map<string, PendingSwap>();

function genId(): string {
  // Short random id; good enough for demo.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const PendingSwapStore = {
  create(input: { unsignedTransactionXdr: string; networkPassphrase: string }): PendingSwap {
    const id = genId();
    const item: PendingSwap = {
      id,
      createdAt: Date.now(),
      status: "created",
      unsignedTransactionXdr: input.unsignedTransactionXdr,
      networkPassphrase: input.networkPassphrase,
    };
    store.set(id, item);
    return item;
  },

  get(id: string): PendingSwap | undefined {
    return store.get(id);
  },

  setSigned(id: string, signedTransactionXdr: string): PendingSwap {
    const item = store.get(id);
    if (!item) throw new Error("Pending swap not found");
    if (item.status === "cancelled") throw new Error("Pending swap was cancelled");
    item.signedTransactionXdr = signedTransactionXdr;
    item.status = "signed";
    store.set(id, item);
    return item;
  },

  setSubmitted(id: string, txHash: string): PendingSwap {
    const item = store.get(id);
    if (!item) throw new Error("Pending swap not found");
    item.transactionHash = txHash;
    item.status = "submitted";
    store.set(id, item);
    return item;
  },

  cancel(id: string): PendingSwap {
    const item = store.get(id);
    if (!item) throw new Error("Pending swap not found");
    item.status = "cancelled";
    store.set(id, item);
    return item;
  },

  delete(id: string): void {
    store.delete(id);
  },
};

