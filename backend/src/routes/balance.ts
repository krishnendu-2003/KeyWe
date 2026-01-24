import { Router } from "express";
import { BalanceService } from "../services/balanceService.js";

const router = Router();
const balanceService = new BalanceService();

router.get("/:publicKey", async (req, res) => {
  try {
    const { publicKey } = req.params;

    if (!publicKey) {
      return res.status(400).json({
        error: "Missing publicKey parameter"
      });
    }

    const balances = await balanceService.getAccountBalances(publicKey);
    res.json(balances);
  } catch (error: any) {
    console.error("Balance error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as balanceRoutes };
