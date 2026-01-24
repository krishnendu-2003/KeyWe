import express from "express";
import { QuoteService } from "../services/quoteService";

const router = express.Router();
const quoteService = new QuoteService();

router.post("/sms", async (req, res) => {
    try {
        const body = req.body.Body as string;
        const from = req.body.From;

        // Example: SWAP 10 XML to USDC
        const parts = body.trim().toUpperCase().split(" ");

        if (parts.length !== 5 || parts[0] !== "SWAP" || parts[3] !== "TO") {
            return res.send("Invalid command. Please use the format: SWAP <amount> <from asset> TO <to asset>");
        }

        const amount = BigInt(parts[1]);
        const fromAsset = parts[2];
        const toAsset = parts[4];

        const quote = await quoteService.getQuote({
            fromAsset,
            toAsset,
            amount,
            slippage: 0.5,
        });

        return res.send(
            `✅ Quote Found\n` +
            `You send: ${quote.amountIn} ${fromAsset}\n` +
            `You receive: ${quote.amountOut} ${toAsset}`
        );
    
    } catch (err:any) {
        return res.send(`❌ Error: ${err.message}`);
    }
});

export default router;