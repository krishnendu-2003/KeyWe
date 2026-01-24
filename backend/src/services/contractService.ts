import {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  SorobanRpc,
  Operation,
} from "@stellar/stellar-sdk";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export class ContractService {
  private rpc: SorobanRpc.Server;
  private sourceKeypair: Keypair;

  constructor() {
    const sorobanRpcUrl =
      process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

    this.rpc = new SorobanRpc.Server(sorobanRpcUrl);

    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
      throw new Error("SECRET_KEY environment variable is required");
    }

    this.sourceKeypair = Keypair.fromSecret(secretKey);
  }

  // --------------------------------
  // Helpers
  // --------------------------------
  private async pollTx(hash: string) {
    while (true) {
      const tx = await this.rpc.getTransaction(hash);
      if (tx.status === "SUCCESS") return tx;
      if (tx.status === "FAILED") {
        throw new Error(`Transaction failed: ${tx.resultXdr}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // --------------------------------
  // Upload WASM
  // --------------------------------
  async uploadWasm(wasmPath: string) {
    const wasm = fs.readFileSync(wasmPath);

    const account = await this.rpc.getAccount(
      this.sourceKeypair.publicKey()
    );

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.uploadContractWasm({
          wasm,
        })
      )
      .setTimeout(120)
      .build();

    // 🔑 REQUIRED for Soroban
    tx = await this.rpc.prepareTransaction(tx);

    tx.sign(this.sourceKeypair);

    const send = await this.rpc.sendTransaction(tx);
    const result = await this.pollTx(send.hash);

    const meta = result.resultMetaXdr as xdr.TransactionMeta;
    const wasmHash =
      meta
        .v3()
        ?.sorobanMeta()
        ?.returnValue()
        ?.bytes()
        ?.toString("hex");

    if (!wasmHash) {
      throw new Error("Failed to extract wasmHash");
    }

    return {
      wasmHash,
      transactionHash: send.hash,
    };
  }

  // --------------------------------
  // Deploy Contract
  // --------------------------------
  async deployContract(wasmHashHex: string) {
    const account = await this.rpc.getAccount(
      this.sourceKeypair.publicKey()
    );

    const salt = crypto.randomBytes(32);

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.createCustomContract({
          wasmHash: Buffer.from(wasmHashHex, "hex"),
          salt,
        })
      )
      .setTimeout(120)
      .build();

    tx = await this.rpc.prepareTransaction(tx);
    tx.sign(this.sourceKeypair);

    const send = await this.rpc.sendTransaction(tx);
    const result = await this.pollTx(send.hash);

    const meta = result.resultMetaXdr as xdr.TransactionMeta;
    const contractId =
      meta
        .v3()
        ?.sorobanMeta()
        ?.returnValue()
        ?.address()
        ?.contractId()
        ?.toString("hex");

    if (!contractId) {
      throw new Error("Failed to extract contractId");
    }

    return {
      contractId,
      transactionHash: send.hash,
    };
  }

  // --------------------------------
  // Invoke Contract (backend signed)
  // --------------------------------
  async invokeContract({
    contractId,
    functionName,
    args,
  }: {
    contractId: string;
    functionName: string;
    args: xdr.ScVal[];
  }) {
    const account = await this.rpc.getAccount(
      this.sourceKeypair.publicKey()
    );

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: functionName,
          args,
        })
      )
      .setTimeout(120)
      .build();

    tx = await this.rpc.prepareTransaction(tx);
    tx.sign(this.sourceKeypair);

    const send = await this.rpc.sendTransaction(tx);
    const result = await this.pollTx(send.hash);

    return {
      transactionHash: send.hash,
      result: result.returnValue,
    };
  }
}
