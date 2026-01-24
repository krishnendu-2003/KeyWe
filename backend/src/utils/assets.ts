// import { Asset } from "@stellar/stellar-sdk";

// export const ISSUERS = {
//   USDC: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
// };

// export function getAsset(code: string): Asset {
//   if (code === "XLM") return Asset.native();
//   return new Asset(code, ISSUERS[code as keyof typeof ISSUERS]);
// }


export const ASSETS: Record<string, string> = {
    XLM: "native",
  
    // Testnet USDC (Circle test issuer)
    USDC: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  
    // Testnet EURC (placeholder - update with actual testnet issuer)
    EURC: "EURC:GDUKMGUGD3Q6XK3SX7X6X3X6X3X6X3X6X3X6X3X6X3X6X3X6X3",
  };
  