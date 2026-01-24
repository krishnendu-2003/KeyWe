import { Router } from "express";
import { ContractService } from "../services/contractService.js";
import fs from "fs";
import path from "path";

const router = Router();
const contractService = new ContractService();

router.post("/upload", async (req, res) => {
  try {
    const wasmPath = req.body.wasmPath || "./contract/target/wasm32v1-none/release/swap_aggregator.wasm";
    
    if (!fs.existsSync(wasmPath)) {
      return res.status(404).json({ error: "WASM file not found" });
    }

    const result = await contractService.uploadWasm(wasmPath);
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

    const result = await contractService.deployContract(wasmHash);
    res.json(result);
  } catch (error: any) {
    console.error("Deploy error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/invoke", async (req, res) => {
  try {
    const { contractId, functionName, args, userPublicKey, signature } = req.body;

    if (!contractId || !functionName) {
      return res.status(400).json({
        error: "Missing required fields: contractId, functionName"
      });
    }

    const result = await contractService.invokeContract({
      contractId,
      functionName,
      args,
      userPublicKey,
      signature
    });

    res.json(result);
  } catch (error: any) {
    console.error("Invoke error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as contractRoutes };
