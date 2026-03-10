export interface FFPriceResponse {
  code: number;
  msg: string;
  data: {
    from: {
      code: string;
      network: string;
      coin: string;
      amount: number;
      rate: number;
      precision: number;
      min: number;
      max: number;
      usd: number;
      btc: number;
    };
    to: {
      code: string;
      network: string;
      coin: string;
      amount: number;
      rate: number;
      precision: number;
      min: number;
      max: number;
      usd: number;
    };
    errors: any[];
    ccies: FFCurrency[];
  };
}

export interface FFCurrency {
  code: string;
  coin: string;
  network: string;
  name: string;
  recv: boolean;
  send: boolean;
  tag: string | null;
  logo: string;
  color: string;
  priority: string;
}

export const FixedFloatService = {
  getCurrencies: async (): Promise<FFCurrency[]> => {
    try {
      const res = await fetch('/api/ff/ccies', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to fetch currencies');
      const data = await res.json();
      if (data.code === 0 && data.data) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  getPrice: async (fromCcy: string, toCcy: string, amount: number, direction: 'from' | 'to', type: 'float' | 'fixed'): Promise<FFPriceResponse | null> => {
    try {
      const res = await fetch('/api/ff/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCcy, toCcy, amount, direction, type })
      });
      if (!res.ok) throw new Error('Failed to fetch price');
      const data = await res.json();
      if (data.code === 0) {
        return data;
      }
      console.error("FixedFloat Error:", data.msg);
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  createOrder: async (fromCcy: string, toCcy: string, amount: number, direction: 'from' | 'to', type: 'float' | 'fixed', toAddress: string) => {
    try {
      const res = await fetch('/api/ff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCcy, toCcy, amount, direction, type, toAddress })
      });
      if (!res.ok) throw new Error('Failed to create order');
      const data = await res.json();
      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
};
