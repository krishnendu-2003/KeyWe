import { ContractService } from "./contractService.js";
import { PathPaymentService } from "./pathPaymentService.js";
import { xdr } from "@stellar/stellar-sdk";

export interface SwapRequest {
  route: any[];
  userPublicKey: string;
  amountIn: string;
  amountOut: string;
  fromAsset: string;
  toAsset: string;
  slippage?: number;
  signature?: string;
}

export interface SwapResponse {
  transactionXdr?: string;
  transactionHash?: string;
  status: string;
  amountOut: string;
  networkPassphrase?: string;
  needsSignature?: boolean;
}

export class SwapService {
  private contractService: ContractService | null = null;
  private pathPaymentService: PathPaymentService;

  constructor() {
    this.pathPaymentService = new PathPaymentService();
  }

  private getContractService() {
    if (!this.contractService) {
      this.contractService = new ContractService();
    }
    return this.contractService;
  }

  async buildSwapTransaction(request: SwapRequest): Promise<SwapResponse> {
    const { route, userPublicKey, amountIn, amountOut, fromAsset, toAsset, slippage } = request;

    const contractId = process.env.CONTRACT_ID;

    if (!contractId) {
      // Build a real Path Payment transaction using Stellar's native operations
      console.log("Building Path Payment transaction (no contract deployed)");
      
      const pathPayment = await this.pathPaymentService.buildPathPaymentTransaction({
        fromAsset,
        toAsset,
        amountIn,
        amountOut,
        userPublicKey,
        route,
        slippage: slippage ?? 0.005
      });

      return {
        transactionXdr: pathPayment.transactionXdr,
        networkPassphrase: pathPayment.networkPassphrase,
        status: "pending_signature",
        amountOut: amountOut,
        needsSignature: true
      };
    }

    // Contract execution - will be implemented when contract is deployed
    // For now, this path won't be reached since contractId check happens earlier
    throw new Error("Contract execution not yet implemented");
  }

  async submitTransaction(signedTransactionXdr: string, networkPassphrase: string): Promise<SwapResponse> {
    const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
    
    // Submit transaction directly to Horizon
    const response = await fetch(`${horizonUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `tx=${encodeURIComponent(signedTransactionXdr)}`,
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData: any = await response.json();
        console.error('Transaction submission error:', errorData);
        
        // Extract detailed error information
        if (errorData.extras?.result_codes) {
          const resultCodes = errorData.extras.result_codes;
          errorMessage = `Transaction failed: ${JSON.stringify(resultCodes)}`;
        } else if (errorData.detail) {
          errorMessage = `Transaction failed: ${errorData.detail}`;
        } else if (errorData.title) {
          errorMessage = `Transaction failed: ${errorData.title}`;
        } else if (errorData.type) {
          errorMessage = `Transaction failed: ${errorData.type}`;
        } else {
          errorMessage = `Transaction failed: ${JSON.stringify(errorData)}`;
        }
      } catch (parseError) {
        const text = await response.text();
        errorMessage = `Transaction failed: ${response.status} ${response.statusText} - ${text}`;
      }
      
      throw new Error(errorMessage);
    }

    const result: any = await response.json();
    return {
      transactionHash: result.hash,
      status: "completed",
      amountOut: "0" // Will be determined from transaction result
    };
  }
}
