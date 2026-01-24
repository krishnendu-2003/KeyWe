import { Router } from "express";
import {
  Account,
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const router = Router();

function horizonAssetToSdkAsset(horizonAsset: any): Asset {
  if (horizonAsset?.asset_type === "native") return Asset.native();
  if (horizonAsset?.asset_code && horizonAsset?.asset_issuer) {
    return new Asset(String(horizonAsset.asset_code), String(horizonAsset.asset_issuer));
  }
  throw new Error("Invalid asset in offer record");
}

async function fetchAccount(horizonUrl: string, publicKey: string) {
  const res = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch account: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function fetchOffers(horizonUrl: string, publicKey: string) {
  // Horizon supports /accounts/:id/offers
  const res = await fetch(`${horizonUrl}/accounts/${publicKey}/offers?limit=200`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch offers: ${res.status} ${res.statusText} - ${text}`);
  }
  const json: any = await res.json();
  return json?._embedded?.records || [];
}

router.get("/:publicKey", async (req, res) => {
  try {
    const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
    const publicKey = String(req.params.publicKey || "");
    if (!publicKey) return res.status(400).json({ error: "Missing publicKey parameter" });

    const records = await fetchOffers(horizonUrl, publicKey);
    const simplified = records.map((o: any) => ({
      id: String(o.id),
      selling: o.selling,
      buying: o.buying,
      amount: o.amount,
      price: o.price,
      last_modified_ledger: o.last_modified_ledger,
    }));
    res.json({ offers: simplified });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to fetch offers" });
  }
});

/**
 * Build a transaction that deletes offers (ManageSellOffer amount=0).
 * This fixes Stellar error `op_cross_self` by removing self-owned offers that would be crossed by swaps.
 *
 * Body:
 *  - publicKey (required)
 *  - offerIds?: string[] (optional; if omitted, cancels all offers for the account)
 */
router.post("/cancel/build", async (req, res) => {
  try {
    const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
    const networkPassphrase = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;

    const { publicKey, offerIds } = req.body || {};
    if (!publicKey) return res.status(400).json({ error: "Missing required field: publicKey" });

    const accountData: any = await fetchAccount(horizonUrl, String(publicKey));
    const offers: any[] = await fetchOffers(horizonUrl, String(publicKey));

    const offerIdSet =
      Array.isArray(offerIds) && offerIds.length
        ? new Set(offerIds.map((x: any) => String(x)))
        : null;

    const toCancel = offerIdSet ? offers.filter((o) => offerIdSet.has(String(o.id))) : offers;
    if (!toCancel.length) {
      return res.status(400).json({ error: "No offers to cancel for this account" });
    }

    const sourceAccount = new Account(String(publicKey), accountData.sequence);
    let tb = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    });

    for (const o of toCancel) {
      tb = tb.addOperation(
        Operation.manageSellOffer({
          selling: horizonAssetToSdkAsset(o.selling),
          buying: horizonAssetToSdkAsset(o.buying),
          amount: "0", // delete offer
          price: String(o.price),
          offerId: String(o.id),
        })
      );
    }

    const tx = tb.setTimeout(30).build();
    return res.json({
      transactionXdr: tx.toXDR(),
      networkPassphrase,
      offersCancelled: toCancel.map((o) => String(o.id)),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to build cancel-offers transaction" });
  }
});

export { router as offersRoutes };

