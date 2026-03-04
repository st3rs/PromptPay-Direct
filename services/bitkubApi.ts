
/**
 * Bitkub Exchange API Service
 *
 * Handles authenticated API calls to Bitkub V3 endpoints.
 * Authentication: HMAC SHA-256 signing with API key/secret.
 *
 * Environment variables:
 *   VITE_BITKUB_API_KEY    - Your Bitkub API key
 *   VITE_BITKUB_API_SECRET - Your Bitkub API secret
 */

const BASE_URL = 'https://api.bitkub.com';

// Read credentials from Vite env at runtime
const getCredentials = () => ({
  apiKey: (import.meta as any).env?.VITE_BITKUB_API_KEY || '',
  apiSecret: (import.meta as any).env?.VITE_BITKUB_API_SECRET || '',
});

/**
 * HMAC SHA-256 signing using Web Crypto API (browser-native, no dependencies)
 */
async function hmacSign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Build the signature payload per Bitkub V3 spec:
 *   timestamp + method + path + queryString + jsonBody
 */
function buildSignaturePayload(
  timestamp: number,
  method: string,
  path: string,
  query: string = '',
  body: string = ''
): string {
  return `${timestamp}${method}${path}${query}${body}`;
}

// --- Public (unsigned) requests ---

export interface BitkubTicker {
  id: number;
  last: number;
  lowestAsk: number;
  highestBid: number;
  percentChange: number;
  baseVolume: number;
  quoteVolume: number;
  isFrozen: number;
  high24hr: number;
  low24hr: number;
  change: number;
  prevClose: number;
  prevOpen: number;
}

export interface BitkubTickerResponse {
  [symbol: string]: BitkubTicker;
}

/**
 * GET /api/v3/market/ticker — fetch live market prices
 * No authentication needed.
 */
export async function fetchTicker(symbol?: string): Promise<BitkubTickerResponse> {
  const query = symbol ? `?sym=${symbol}` : '';
  const res = await fetch(`${BASE_URL}/api/v3/market/ticker${query}`);
  if (!res.ok) throw new Error(`Bitkub ticker error: ${res.status}`);
  return res.json();
}

/**
 * Fetch live THB_USDT rate from Bitkub.
 * Returns the last traded price for USDT in THB.
 */
export async function fetchUsdtRate(): Promise<number> {
  const data = await fetchTicker('THB_USDT');
  const ticker = data['THB_USDT'];
  if (!ticker) throw new Error('THB_USDT pair not found on Bitkub');
  return ticker.last;
}

/**
 * GET /api/v3/market/depth — order book snapshot
 */
export async function fetchOrderDepth(symbol: string = 'THB_USDT', limit: number = 10) {
  const res = await fetch(`${BASE_URL}/api/v3/market/depth?sym=${symbol}&lmt=${limit}`);
  if (!res.ok) throw new Error(`Bitkub depth error: ${res.status}`);
  return res.json();
}

// --- Authenticated requests ---

interface SecureRequestOptions {
  method: 'GET' | 'POST';
  path: string;
  query?: Record<string, string>;
  body?: Record<string, any>;
}

/**
 * Sends an authenticated request to Bitkub V3 API.
 * Adds X-BTK-APIKEY, X-BTK-TIMESTAMP, X-BTK-SIGN headers.
 */
async function secureRequest<T = any>(opts: SecureRequestOptions): Promise<T> {
  const { apiKey, apiSecret } = getCredentials();
  if (!apiKey || !apiSecret) {
    throw new Error('Bitkub API credentials not configured. Set VITE_BITKUB_API_KEY and VITE_BITKUB_API_SECRET.');
  }

  const timestamp = Date.now();
  const queryString = opts.query
    ? '?' + new URLSearchParams(opts.query).toString()
    : '';
  const jsonBody = opts.body ? JSON.stringify(opts.body) : '';

  const signaturePayload = buildSignaturePayload(
    timestamp,
    opts.method,
    opts.path,
    queryString,
    jsonBody
  );

  const signature = await hmacSign(apiSecret, signaturePayload);

  const url = `${BASE_URL}${opts.path}${queryString}`;
  const headers: Record<string, string> = {
    'X-BTK-APIKEY': apiKey,
    'X-BTK-TIMESTAMP': timestamp.toString(),
    'X-BTK-SIGN': signature,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: opts.method === 'POST' ? jsonBody : undefined,
  });

  if (res.status === 429) {
    throw new Error('Bitkub rate limit exceeded. Wait 30 seconds.');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bitkub API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.error && data.error !== 0) {
    throw new Error(`Bitkub error code ${data.error}: ${JSON.stringify(data)}`);
  }
  return data;
}

// --- Trading endpoints ---

export interface PlaceOrderResult {
  id: string;
  hash: string;
  typ: string;
  amt: number;
  rat: number;
  fee: number;
  cre: number;
  rec: number;
  ts: number;
}

/**
 * POST /api/v3/market/place-bid — place a buy order
 * @param symbol  e.g. "THB_USDT"
 * @param amount  THB amount to spend
 * @param rate    price per unit (0 = market order)
 * @param type    "market" or "limit"
 */
export async function placeBuyOrder(
  symbol: string,
  amount: number,
  rate: number = 0,
  type: 'market' | 'limit' = 'market'
): Promise<{ result: PlaceOrderResult }> {
  return secureRequest({
    method: 'POST',
    path: '/api/v3/market/place-bid',
    body: {
      sym: symbol,
      amt: amount,
      rat: rate,
      typ: type,
    },
  });
}

/**
 * POST /api/v3/market/place-ask — place a sell order
 */
export async function placeSellOrder(
  symbol: string,
  amount: number,
  rate: number = 0,
  type: 'market' | 'limit' = 'market'
): Promise<{ result: PlaceOrderResult }> {
  return secureRequest({
    method: 'POST',
    path: '/api/v3/market/place-ask',
    body: {
      sym: symbol,
      amt: amount,
      rat: rate,
      typ: type,
    },
  });
}

// --- Wallet / Balance endpoints ---

export interface BitkubBalances {
  [currency: string]: {
    available: number;
    reserved: number;
  };
}

/**
 * POST /api/v3/market/balances — get all balances
 */
export async function fetchBalances(): Promise<{ result: BitkubBalances }> {
  return secureRequest({
    method: 'POST',
    path: '/api/v3/market/balances',
    body: {},
  });
}

/**
 * POST /api/v3/market/wallet — get available balances only
 */
export async function fetchWallet(): Promise<{ result: Record<string, number> }> {
  return secureRequest({
    method: 'POST',
    path: '/api/v3/market/wallet',
    body: {},
  });
}

// --- Order history ---

/**
 * GET /api/v3/market/my-order-history
 */
export async function fetchOrderHistory(
  symbol: string = 'THB_USDT',
  limit: number = 10
) {
  return secureRequest({
    method: 'GET',
    path: '/api/v3/market/my-order-history',
    query: { sym: symbol, lmt: limit.toString() },
  });
}

// --- Utility ---

/**
 * Check if Bitkub credentials are configured
 */
export function isConfigured(): boolean {
  const { apiKey, apiSecret } = getCredentials();
  return !!(apiKey && apiSecret);
}

export const BitkubApi = {
  fetchTicker,
  fetchUsdtRate,
  fetchOrderDepth,
  placeBuyOrder,
  placeSellOrder,
  fetchBalances,
  fetchWallet,
  fetchOrderHistory,
  isConfigured,
};
