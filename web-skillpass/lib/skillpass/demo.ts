import { createWalletClient, http, type WalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { FUJI } from "./config";

const MNEMONIC = process.env.NEXT_PUBLIC_DEMO_MNEMONIC ?? "";
export const DEMO_ENABLED = MNEMONIC.trim().split(/\s+/).length >= 12;
const RPC_URL = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? FUJI.rpcUrls.default.http[0];

/// The institution is member index 0. This wallet client lets the demo issue credentials
/// without a browser wallet popup. Testnet only.
export function demoIssuerClient(): WalletClient | null {
  if (!DEMO_ENABLED) return null;
  const account = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
  return createWalletClient({ account, chain: FUJI, transport: http(RPC_URL) });
}

export function demoStudentAddress(index: number): `0x${string}` {
  return mnemonicToAccount(MNEMONIC, { addressIndex: index }).address;
}
