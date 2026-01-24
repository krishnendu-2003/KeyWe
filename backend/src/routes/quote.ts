import { Router } from "express";
import { QuoteService } from "../services/quoteService.js";

const router = Router();
const quoteService = new QuoteService();

router.post("/", async (req, res) => {
  try {
    const { fromAsset, toAsset, amount, slippage, userPublicKey } = req.body;

    if (!fromAsset || !toAsset || !amount) {
      return res.status(400).json({
        error: "Missing required fields: fromAsset, toAsset, amount"
      });
    }

    const quote = await quoteService.getQuote({
      fromAsset,
      toAsset,
      amount: BigInt(amount),
      slippage: slippage || 0.005, // 0.5% default
      userPublicKey
    });

    res.json(quote);
  } catch (error: any) {
    console.error("Quote error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as quoteRoutes };
