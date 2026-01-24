import { Router } from "express";
import { SwapService } from "../services/swapService.js";

const router = Router();
const swapService = new SwapService();

router.post("/build", async (req, res) => {
  try {
    const { route, userPublicKey, amountIn, amountOut, fromAsset, toAsset, slippage } = req.body;

    if (!route || !userPublicKey || !amountIn || !amountOut) {
      return res.status(400).json({
        error: "Missing required fields: route, userPublicKey, amountIn, amountOut"
      });
    }

    const result = await swapService.buildSwapTransaction({
      route,
      userPublicKey,
      amountIn,
      amountOut,
      fromAsset: fromAsset || route[0]?.fromAsset,
      toAsset: toAsset || route[route.length - 1]?.toAsset,
      slippage: typeof slippage === "number" ? slippage : 0.005,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Swap build error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/execute", async (req, res) => {
  try {
    const { signedTransactionXdr, networkPassphrase } = req.body;

    if (!signedTransactionXdr || !networkPassphrase) {
      return res.status(400).json({
        error: "Missing required fields: signedTransactionXdr, networkPassphrase"
      });
    }

    const result = await swapService.submitTransaction(signedTransactionXdr, networkPassphrase);
    res.json(result);
  } catch (error: any) {
    console.error("Swap execution error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as swapRoutes };
