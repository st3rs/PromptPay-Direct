
/**
 * In-App Wallet Service
 *
 * Tracks USDT balance accumulated from auto-buy operations.
 * Persists to localStorage. Provides subscribe/notify pattern
 * consistent with the rest of the codebase.
 */

export interface WalletEntry {
  id: string;
  type: 'BUY' | 'WITHDRAW' | 'ADJUSTMENT';
  amount: number;       // USDT amount (positive = credit, negative = debit)
  thbSpent: number;     // THB spent for this buy
  rate: number;         // THB/USDT rate at time of execution
  fee: number;          // Exchange fee in THB
  bitkubOrderId: string | null; // Bitkub order ID (null if simulated)
  txReferenceId: string; // Links back to the PromptPay transaction
  timestamp: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  note?: string;
}

export interface WalletState {
  usdtBalance: number;
  thbTotalSpent: number;
  entries: WalletEntry[];
}

const STORAGE_KEY = 'promptpay_wallet';

const loadState = (): WalletState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load wallet state:', e);
  }
  return { usdtBalance: 0, thbTotalSpent: 0, entries: [] };
};

const saveState = (state: WalletState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save wallet state:', e);
  }
};

let state: WalletState = loadState();
let listeners: ((s: WalletState) => void)[] = [];

const notify = () => {
  const snapshot = { ...state, entries: [...state.entries] };
  listeners.forEach(l => l(snapshot));
};

export const WalletService = {
  getState: (): WalletState => ({ ...state, entries: [...state.entries] }),

  subscribe: (cb: (s: WalletState) => void) => {
    listeners.push(cb);
    cb({ ...state, entries: [...state.entries] });
    return () => {
      listeners = listeners.filter(l => l !== cb);
    };
  },

  /**
   * Credit USDT to the wallet after a successful Bitkub buy.
   */
  creditBuy: (params: {
    usdtAmount: number;
    thbSpent: number;
    rate: number;
    fee: number;
    bitkubOrderId: string | null;
    txReferenceId: string;
  }): WalletEntry => {
    const entry: WalletEntry = {
      id: `W-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      type: 'BUY',
      amount: params.usdtAmount,
      thbSpent: params.thbSpent,
      rate: params.rate,
      fee: params.fee,
      bitkubOrderId: params.bitkubOrderId,
      txReferenceId: params.txReferenceId,
      timestamp: Date.now(),
      status: 'COMPLETED',
    };

    state.usdtBalance += params.usdtAmount;
    state.thbTotalSpent += params.thbSpent;
    state.entries.unshift(entry);
    saveState(state);
    notify();
    return entry;
  },

  /**
   * Record a pending buy (before Bitkub order executes).
   */
  recordPending: (params: {
    thbAmount: number;
    estimatedUsdt: number;
    rate: number;
    txReferenceId: string;
  }): WalletEntry => {
    const entry: WalletEntry = {
      id: `W-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      type: 'BUY',
      amount: params.estimatedUsdt,
      thbSpent: params.thbAmount,
      rate: params.rate,
      fee: 0,
      bitkubOrderId: null,
      txReferenceId: params.txReferenceId,
      timestamp: Date.now(),
      status: 'PENDING',
    };

    state.entries.unshift(entry);
    saveState(state);
    notify();
    return entry;
  },

  /**
   * Finalize a pending entry after Bitkub order fills.
   */
  finalizePending: (entryId: string, params: {
    actualUsdt: number;
    actualRate: number;
    fee: number;
    bitkubOrderId: string;
  }) => {
    const entry = state.entries.find(e => e.id === entryId);
    if (!entry || entry.status !== 'PENDING') return;

    entry.amount = params.actualUsdt;
    entry.rate = params.actualRate;
    entry.fee = params.fee;
    entry.bitkubOrderId = params.bitkubOrderId;
    entry.status = 'COMPLETED';

    state.usdtBalance += params.actualUsdt;
    state.thbTotalSpent += entry.thbSpent;
    saveState(state);
    notify();
  },

  /**
   * Mark a pending entry as failed.
   */
  markFailed: (entryId: string, note?: string) => {
    const entry = state.entries.find(e => e.id === entryId);
    if (!entry) return;
    entry.status = 'FAILED';
    entry.note = note;
    saveState(state);
    notify();
  },

  /**
   * Reset wallet (admin action).
   */
  reset: () => {
    state = { usdtBalance: 0, thbTotalSpent: 0, entries: [] };
    saveState(state);
    notify();
  },
};
