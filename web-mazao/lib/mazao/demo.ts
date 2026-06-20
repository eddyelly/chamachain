import { createWalletClient, http, type WalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { FUJI } from "./config";

const MNEMONIC = process.env.NEXT_PUBLIC_DEMO_MNEMONIC ?? "";
export const DEMO_ENABLED = MNEMONIC.trim().split(/\s+/).length >= 12;
const RPC_URL = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? FUJI.rpcUrls.default.http[0];

export const ROLE = { farmer: 0, transporter: 1, buyer: 2 } as const;
export type Role = keyof typeof ROLE;

export function demoAddress(role: Role): `0x${string}` {
  if (!DEMO_ENABLED) return "0x0000000000000000000000000000000000000000";
  return mnemonicToAccount(MNEMONIC, { addressIndex: ROLE[role] }).address;
}

/// A viem wallet client signing as the given demo role. Testnet only.
export function demoClient(role: Role): WalletClient | null {
  if (!DEMO_ENABLED) return null;
  const account = mnemonicToAccount(MNEMONIC, { addressIndex: ROLE[role] });
  return createWalletClient({ account, chain: FUJI, transport: http(RPC_URL) });
}
