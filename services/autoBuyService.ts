
/**
 * Auto-Buy Automation Service
 *
 * Orchestrates the full flow:
 *   1. QR payment received (bank webhook confirms THB)
 *   2. Automatically places a market buy on Bitkub (THB → USDT)
 *   3. Credits USDT to the in-app wallet
 *
 * Falls back to simulation when Bitkub API keys are not configured.
 */

import { BitkubApi, PlaceOrderResult } from './bitkubApi';
import { WalletService, WalletEntry } from './walletService';
import { generateHash } from '../utils/security';

export interface AutoBuyResult {
  success: boolean;
  walletEntryId: string;
  usdtReceived: number;
  thbSpent: number;
  effectiveRate: number;
  fee: number;
  bitkubOrderId: string | null;
  isSimulated: boolean;
  error?: string;
}

export type AutoBuyLogCallback = (
  module: 'BITKUB' | 'WALLET' | 'AUTO-BUY',
  message: string,
  level: 'INFO' | 'WARN' | 'CRITICAL'
) => void;

/**
 * Execute an automatic USDT buy for a confirmed THB payment.
 *
 * @param thbAmount      THB received from the QR payment
 * @param txReferenceId  Transaction reference for tracking
 * @param onLog          Optional callback for system logs
 */
export async function executeAutoBuy(
  thbAmount: number,
  txReferenceId: string,
  onLog?: AutoBuyLogCallback
): Promise<AutoBuyResult> {
  const log = onLog || (() => {});

  log('AUTO-BUY', `Initiating auto-buy for ฿${thbAmount.toLocaleString()} (Ref: ${txReferenceId})`, 'INFO');

  // Check if Bitkub API is configured
  if (!BitkubApi.isConfigured()) {
    log('BITKUB', 'API keys not configured — running in simulation mode', 'WARN');
    return executeSimulatedBuy(thbAmount, txReferenceId, log);
  }

  // Real Bitkub flow
  try {
    // Step 1: Fetch live rate for estimation
    log('BITKUB', 'Fetching live THB_USDT rate...', 'INFO');
    const liveRate = await BitkubApi.fetchUsdtRate();
    const estimatedUsdt = thbAmount / liveRate;
    log('BITKUB', `Live rate: ${liveRate} THB/USDT — estimated receive: ${estimatedUsdt.toFixed(4)} USDT`, 'INFO');

    // Step 2: Record pending in wallet
    const pendingEntry = WalletService.recordPending({
      thbAmount,
      estimatedUsdt,
      rate: liveRate,
      txReferenceId,
    });
    log('WALLET', `Pending wallet entry created: ${pendingEntry.id}`, 'INFO');

    // Step 3: Place market buy order on Bitkub
    log('BITKUB', `Placing market buy order: ฿${thbAmount} → THB_USDT`, 'INFO');
    const orderResult = await BitkubApi.placeBuyOrder('THB_USDT', thbAmount, 0, 'market');
    const order = orderResult.result;

    log('BITKUB', `Order filled! ID: ${order.id}, Received: ${order.rec} USDT, Fee: ${order.fee} THB`, 'INFO');

    // Step 4: Finalize wallet entry with actual amounts
    WalletService.finalizePending(pendingEntry.id, {
      actualUsdt: order.rec,
      actualRate: order.rat,
      fee: order.fee,
      bitkubOrderId: order.id,
    });

    const result: AutoBuyResult = {
      success: true,
      walletEntryId: pendingEntry.id,
      usdtReceived: order.rec,
      thbSpent: thbAmount,
      effectiveRate: thbAmount / order.rec,
      fee: order.fee,
      bitkubOrderId: order.id,
      isSimulated: false,
    };

    log('AUTO-BUY', `Auto-buy complete: ${order.rec} USDT credited to wallet`, 'INFO');
    log('WALLET', `Balance updated: +${order.rec} USDT | Total: ${WalletService.getState().usdtBalance.toFixed(4)} USDT`, 'INFO');

    return result;

  } catch (error: any) {
    log('BITKUB', `API error: ${error.message}`, 'CRITICAL');
    log('AUTO-BUY', 'Falling back to simulation mode due to API error', 'WARN');

    // Mark any pending entries as failed
    const pending = WalletService.getState().entries.find(
      e => e.txReferenceId === txReferenceId && e.status === 'PENDING'
    );
    if (pending) {
      WalletService.markFailed(pending.id, error.message);
    }

    // Fall back to simulation
    return executeSimulatedBuy(thbAmount, txReferenceId, log);
  }
}

/**
 * Simulated buy for when API keys aren't available or API fails.
 * Uses a realistic simulated rate with small random spread.
 */
async function executeSimulatedBuy(
  thbAmount: number,
  txReferenceId: string,
  log: AutoBuyLogCallback
): Promise<AutoBuyResult> {
  // Try to get a real rate for simulation accuracy
  let simulatedRate: number;
  try {
    simulatedRate = await BitkubApi.fetchUsdtRate();
    log('BITKUB', `Using live rate for simulation: ${simulatedRate} THB/USDT`, 'INFO');
  } catch {
    // Fallback to a reasonable hardcoded rate
    simulatedRate = 35.50;
    log('BITKUB', `Using fallback rate: ${simulatedRate} THB/USDT`, 'WARN');
  }

  // Add realistic spread (0.1-0.3%)
  const spread = 1 + (Math.random() * 0.002 + 0.001);
  const effectiveRate = simulatedRate * spread;
  const simulatedFee = thbAmount * 0.0025; // 0.25% Bitkub maker/taker fee
  const usdtReceived = (thbAmount - simulatedFee) / effectiveRate;

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  const simOrderId = `SIM-${generateHash(txReferenceId + Date.now())}`;

  log('BITKUB', `[SIMULATED] Buy order executed at ${effectiveRate.toFixed(2)} THB/USDT`, 'INFO');
  log('BITKUB', `[SIMULATED] Received: ${usdtReceived.toFixed(4)} USDT, Fee: ${simulatedFee.toFixed(2)} THB`, 'INFO');

  // Credit wallet
  const entry = WalletService.creditBuy({
    usdtAmount: parseFloat(usdtReceived.toFixed(4)),
    thbSpent: thbAmount,
    rate: effectiveRate,
    fee: simulatedFee,
    bitkubOrderId: simOrderId,
    txReferenceId,
  });

  log('WALLET', `Balance updated: +${usdtReceived.toFixed(4)} USDT | Total: ${WalletService.getState().usdtBalance.toFixed(4)} USDT`, 'INFO');

  return {
    success: true,
    walletEntryId: entry.id,
    usdtReceived: parseFloat(usdtReceived.toFixed(4)),
    thbSpent: thbAmount,
    effectiveRate,
    fee: simulatedFee,
    bitkubOrderId: simOrderId,
    isSimulated: true,
  };
}

/**
 * Check the current automation status / readiness.
 */
export function getAutoBuyStatus() {
  const isLive = BitkubApi.isConfigured();
  return {
    mode: isLive ? 'LIVE' as const : 'SIMULATION' as const,
    configured: isLive,
    walletBalance: WalletService.getState().usdtBalance,
  };
}

export const AutoBuyService = {
  executeAutoBuy,
  getAutoBuyStatus,
};
