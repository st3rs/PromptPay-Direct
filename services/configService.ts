import { BASE_RATE, SPREAD_PERCENT, PROMPTPAY_ID } from '../constants';
import { AppConfig } from '../types';

const STORAGE_KEY = 'promptpay_gateway_config';

const DEFAULT_CONFIG: AppConfig = {
  baseRate: BASE_RATE,
  feePercent: SPREAD_PERCENT * 100, // Convert 0.008 to 0.8 for display/editing
  promptPayId: PROMPTPAY_ID,
  providerWallet: "TWd4...SimulatedProviderHotWallet",
  defaultAmountTHB: 1000
};

// Helper to load from storage
const loadConfig = (): AppConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn("Failed to load config from storage:", e);
  }
  return DEFAULT_CONFIG;
};

let currentConfig: AppConfig = loadConfig();
let listeners: ((config: AppConfig) => void)[] = [];

export const ConfigService = {
  // Get current snapshot
  get: () => ({ ...currentConfig }),

  // Update specific fields, save to storage, and notify listeners
  update: (updates: Partial<AppConfig>) => {
    currentConfig = { ...currentConfig, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
    } catch (e) {
      console.warn("Failed to save config to storage:", e);
    }
    listeners.forEach(l => l(currentConfig));
  },

  // Reset to default constants
  reset: () => {
    currentConfig = { ...DEFAULT_CONFIG };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear config storage:", e);
    }
    listeners.forEach(l => l(currentConfig));
  },

  // Subscribe to changes
  subscribe: (callback: (config: AppConfig) => void) => {
    listeners.push(callback);
    callback(currentConfig); // Fire immediately with current state
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }
};