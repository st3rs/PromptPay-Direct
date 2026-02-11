
import { Transaction, TransactionStatus, LogEntry, OrderBook } from '../types';
import { generateHash } from '../utils/security';
import { PROMPTPAY_ID, MAX_AUTO_APPROVE_USD } from '../constants';

// Simulated Server State
let currentTransaction: Transaction | null = null;
const transactionHistory: Transaction[] = []; // Store history
let listeners: ((tx: Transaction) => void)[] = [];

// Simulated Database
const logs: LogEntry[] = [];
const orderBook: OrderBook = {
  thbReserves: 5000000,
  usdtReserves: 150000,
  autoHedge: true,
  spread: 0.008
};

const notify = () => {
  if (currentTransaction) {
    listeners.forEach(l => l({ ...currentTransaction! }));
  }
};

const addLog = (module: LogEntry['module'], message: string, level: LogEntry['level'] = 'INFO') => {
  const log: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    hash: generateHash(message + Date.now())
  };
  logs.unshift(log); // Prepend
  if (currentTransaction) {
    currentTransaction.logs = [log, ...(currentTransaction.logs || [])];
  }
};

export const MockBackend = {
  subscribe: (callback: (tx: Transaction) => void) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },

  createTransaction: (tx: Transaction) => {
    currentTransaction = { ...tx, status: TransactionStatus.AWAITING_PAYMENT, logs: [] };
    transactionHistory.unshift(currentTransaction); // Add to history
    addLog('KYC', `New User Session: ${tx.user.fullName} (${tx.user.nationalId})`);
    addLog('LEDGER', `Created TX ${tx.referenceId}. Expecting ฿${tx.amountTHB}`);
    notify();
  },

  // This simulates the Webhook from the Bank
  triggerIncomingTransfer: (amount: number, senderName: string, refId: string) => {
    if (!currentTransaction) return;
    
    addLog('WEBHOOK', `Received incoming_transfer: ฿${amount} from ${senderName}. Ref: ${refId}`);

    if (currentTransaction.status !== TransactionStatus.AWAITING_PAYMENT) {
        addLog('WEBHOOK', 'Warning: Duplicate or late webhook received.', 'WARN');
        return;
    }

    // Step 4: Logic Guard
    currentTransaction.status = TransactionStatus.VERIFYING_BANK;
    notify();

    setTimeout(() => {
      if (!currentTransaction) return;

      const expectedName = currentTransaction.user.fullName.toUpperCase();
      const actualName = senderName.toUpperCase();
      
      // Simple fuzzy match simulation
      if (actualName.includes(expectedName) || expectedName.includes(actualName)) {
         addLog('KYC', `Logic Guard Passed: ${actualName} matches KYC record.`);
         
         // Move to disbursement check
         MockBackend.processDisbursement();
      } else {
         addLog('KYC', `Logic Guard FAILED: ${actualName} does not match ${expectedName}. Freezing funds.`, 'CRITICAL');
         currentTransaction.status = TransactionStatus.FAILED;
         notify();
      }
    }, 2000);
  },

  processDisbursement: () => {
    if (!currentTransaction) return;

    if (currentTransaction.amountUSDT > MAX_AUTO_APPROVE_USD) {
        addLog('DISBURSER', `Amount exceeds $${MAX_AUTO_APPROVE_USD}. Multi-Sig Approval Required.`, 'WARN');
        currentTransaction.status = TransactionStatus.AWAITING_APPROVAL;
        notify();
        return;
    }

    currentTransaction.status = TransactionStatus.DISBURSING;
    notify();
    MockBackend.executeFinalSettlement();
  },

  approveTransaction: () => {
    if (!currentTransaction || currentTransaction.status !== TransactionStatus.AWAITING_APPROVAL) return;
    
    addLog('DISBURSER', `Manual Approval received from Administrator. Proceeding to settlement.`, 'INFO');
    currentTransaction.status = TransactionStatus.DISBURSING;
    notify();
    MockBackend.executeFinalSettlement();
  },

  executeFinalSettlement: () => {
    setTimeout(() => {
      if (!currentTransaction || currentTransaction.status !== TransactionStatus.DISBURSING) return;
      
      // Simulate Blockchain
      addLog('DISBURSER', `Broadcasting TRC20 transfer of ₮${currentTransaction.amountUSDT} to ${currentTransaction.user.walletAddress}`);
      
      // Update Reserves
      orderBook.thbReserves += currentTransaction.amountTHB;
      orderBook.usdtReserves -= currentTransaction.amountUSDT;
      
      // Auto Hedge Logic
      if (orderBook.autoHedge) {
        addLog('LEDGER', `Auto-Hedge: Placed Buy Order for ₮${currentTransaction.amountUSDT} on Binance.`);
      } else {
        addLog('LEDGER', `Auto-Hedge Skipped (Manual Mode). Reserves may unbalance.`);
      }

      currentTransaction.status = TransactionStatus.COMPLETED;
      addLog('LEDGER', `Transaction Finalized. Reconciliation ID: ${currentTransaction.referenceId}`);
      notify();
    }, 3000);
  },

  toggleAutoHedge: () => {
    orderBook.autoHedge = !orderBook.autoHedge;
    addLog('LEDGER', `Auto-Hedge Logic switched to ${orderBook.autoHedge ? 'ON' : 'OFF'}`, 'WARN');
  },

  getLogs: () => logs,
  getOrderBook: () => orderBook,
  getCurrentTransaction: () => currentTransaction,
  getTransactionHistory: () => transactionHistory, // Expose history
};