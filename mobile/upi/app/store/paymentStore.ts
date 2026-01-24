import { create } from 'zustand';

export interface PaymentData {
  protocol: string;
  network: string;
  destination: string;
  amount: string;
  asset: string;
  memo: string;
  callback?: string;
}

interface PaymentState {
  currentPayment: PaymentData | null;
  isProcessing: boolean;
  walletConnected: boolean;
  
  setPayment: (payment: PaymentData) => void;
  setProcessing: (processing: boolean) => void;
  setWalletConnected: (connected: boolean) => void;
  clearPayment: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  currentPayment: null,
  isProcessing: false,
  walletConnected: false,
  
  setPayment: (payment) => set({ currentPayment: payment }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setWalletConnected: (connected) => set({ walletConnected: connected }),
  clearPayment: () => set({ 
    currentPayment: null, 
    isProcessing: false 
  }),
}));