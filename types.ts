
export enum TransactionStatus {
  IDLE = 'IDLE',
  KYC_PENDING = 'KYC_PENDING',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  VERIFYING_BANK = 'VERIFYING_BANK', // Logic Guard
  DISBURSING = 'DISBURSING', // Crypto Transfer
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export type Language = 'en' | 'th';

export interface UserKYC {
  fullName: string;
  nationalId: string; // Thai ID or Passport
  walletAddress: string;
  isVerified: boolean;
}

export interface Transaction {
  id: string;
  referenceId: string; // For bank reconciliation
  user: UserKYC;
  amountTHB: number;
  amountUSDT: number;
  rate: number;
  status: TransactionStatus;
  timestamp: number;
  qrPayload?: string;
  logs: LogEntry[];
  memo?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
  module: 'WEBHOOK' | 'KYC' | 'LEDGER' | 'DISBURSER';
  message: string;
  hash: string; // Simulated hash of the log for integrity
}

export interface OrderBook {
  thbReserves: number;
  usdtReserves: number;
  autoHedge: boolean;
  spread: number;
}

export interface AppConfig {
  baseRate: number;
  feePercent: number; // Stored as percentage (e.g. 0.8 for 0.8%)
  promptPayId: string;
  providerWallet: string;
  defaultAmountTHB: number;
}