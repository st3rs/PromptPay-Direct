import express from "express";
import cors from "cors";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // FixedFloat API Proxy
  app.post("/api/ff/ccies", async (req, res) => {
    const apiKey = process.env.FF_API_KEY;
    const apiSecret = process.env.FF_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.log("Using mock FixedFloat currencies (credentials not configured)");
      return res.json({
        code: 0,
        msg: "",
        data: [
          { code: "BTC", coin: "BTC", network: "BTC", name: "Bitcoin", recv: true, send: true, logo: "https://fixedfloat.com/assets/images/coins/svg/btc.svg", color: "#f7931a", priority: "5" },
          { code: "ETH", coin: "ETH", network: "ETH", name: "Ethereum", recv: true, send: true, logo: "https://fixedfloat.com/assets/images/coins/svg/eth.svg", color: "#627eea", priority: "4" },
          { code: "LTC", coin: "LTC", network: "LTC", name: "Litecoin", recv: true, send: true, logo: "https://fixedfloat.com/assets/images/coins/svg/ltc.svg", color: "#345d9d", priority: "3" },
          { code: "USDTTRC", coin: "USDT", network: "TRX", name: "Tether (TRC20)", recv: true, send: true, logo: "https://fixedfloat.com/assets/images/coins/svg/usdt.svg", color: "#26a17b", priority: "1" }
        ]
      });
    }

    try {
      const payload = "{}";
      const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");

      const response = await fetch("https://ff.io/api/v2/ccies", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-API-KEY": apiKey,
          "X-API-SIGN": signature,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: payload
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FixedFloat ccies error:", error);
      res.status(500).json({ error: "Failed to fetch currencies" });
    }
  });

  app.post("/api/ff/price", async (req, res) => {
    const apiKey = process.env.FF_API_KEY;
    const apiSecret = process.env.FF_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.log("Using mock FixedFloat price (credentials not configured)");
      const { fromCcy, toCcy, amount } = req.body;
      const rate = toCcy === 'BTC' ? 0.000015 : toCcy === 'ETH' ? 0.0003 : toCcy === 'LTC' ? 0.01 : 1;
      return res.json({
        code: 0,
        msg: "",
        data: {
          from: { code: fromCcy, amount: amount },
          to: { code: toCcy, amount: amount * rate, rate: rate }
        }
      });
    }

    try {
      const payload = JSON.stringify(req.body);
      const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");

      const response = await fetch("https://ff.io/api/v2/price", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-API-KEY": apiKey,
          "X-API-SIGN": signature,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: payload
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FixedFloat price error:", error);
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  app.post("/api/ff/create", async (req, res) => {
    const apiKey = process.env.FF_API_KEY;
    const apiSecret = process.env.FF_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.log("Using mock FixedFloat create order (credentials not configured)");
      return res.json({
        code: 0,
        msg: "",
        data: {
          id: "MOCK_ORDER_ID",
          token: "MOCK_TOKEN"
        }
      });
    }

    try {
      const payload = JSON.stringify(req.body);
      const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");

      const response = await fetch("https://ff.io/api/v2/create", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-API-KEY": apiKey,
          "X-API-SIGN": signature,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: payload
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FixedFloat create order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
