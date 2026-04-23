import { Router } from "express";
import { ContractService } from "../services/contractService.js";
import fs from "fs";

const router = Router();

function getContractService() {
  return new ContractService();
}

router.get("/status", async (_req, res) => {
  res.json({
    configured: Boolean(process.env.CONTRACT_ID),
    contractId: process.env.CONTRACT_ID || null,
    sorobanRpcUrl:
      process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  });
});

router.post("/upload", async (req, res) => {
  try {
    const wasmPath = req.body.wasmPath || "./contract/target/wasm32v1-none/release/swap_aggregator.wasm";
    
    if (!fs.existsSync(wasmPath)) {
      return res.status(404).json({ error: "WASM file not found" });
    }

    const result = await getContractService().uploadWasm(wasmPath);
    res.json(result);
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/deploy", async (req, res) => {
  try {
    const { wasmHash } = req.body;

    if (!wasmHash) {
      return res.status(400).json({ error: "Missing wasmHash" });
    }

    const result = await getContractService().deployContract(wasmHash);
    res.json(result);
  } catch (error: any) {
    console.error("Deploy error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/invoke", async (req, res) => {
  try {
    const { contractId, functionName, args } = req.body;

    if (!contractId || !functionName) {
      return res.status(400).json({
        error: "Missing required fields: contractId, functionName"
      });
    }

    const result = await getContractService().invokeContract({
      contractId,
      functionName,
      args,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Invoke error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/preview-swap", async (req, res) => {
  try {
    const { amount, hops, contractId } = req.body;

    if (!amount || typeof hops !== "number") {
      return res.status(400).json({
        error: "Missing required fields: amount, hops",
      });
    }

    const result = await getContractService().previewSwap({
      amount: String(amount),
      hops,
      contractId,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Preview swap error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as contractRoutes };
