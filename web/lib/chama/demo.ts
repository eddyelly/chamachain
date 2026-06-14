import { createWalletClient, http, type WalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { FUJI } from "./config";

/// Demo signer mode. For a live pitch the presenter holds one wallet (the chair, member 0),
/// but the 3-of-5 story needs distinct member approvals on-chain. When NEXT_PUBLIC_DEMO_MNEMONIC
/// is set, the app can submit approvals as members 2..5 using locally derived keys. This is a
/// testnet-only convenience and must never carry real funds. Every approval is a real Fuji tx.

const MNEMONIC = process.env.NEXT_PUBLIC_DEMO_MNEMONIC ?? "";
export const DEMO_ENABLED = MNEMONIC.trim().split(/\s+/).length >= 12;

const RPC_URL = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? FUJI.rpcUrls.default.http[0];

export interface DemoAccount {
  index: number;
  address: `0x${string}`;
}

const DEMO_MEMBER_COUNT = 5;

function deriveAccounts(): DemoAccount[] {
  if (!DEMO_ENABLED) return [];
  return Array.from({ length: DEMO_MEMBER_COUNT }, (_, index) => ({
    index,
    address: mnemonicToAccount(MNEMONIC, { addressIndex: index }).address,
  }));
}

export const demoAccounts: DemoAccount[] = deriveAccounts();

const indexByAddress = new Map<string, number>(
  demoAccounts.map((a) => [a.address.toLowerCase(), a.index]),
);

/// Index of the demo account that controls `address`, or null if not a demo account.
export function demoIndexOf(address: string): number | null {
  const index = indexByAddress.get(address.toLowerCase());
  return index === undefined ? null : index;
}

/// A viem wallet client signing as the demo member at `index`, used to submit that member's
/// approval. Returns null when demo mode is off.
export function demoWalletClient(index: number): WalletClient | null {
  if (!DEMO_ENABLED) return null;
  const account = mnemonicToAccount(MNEMONIC, { addressIndex: index });
  return createWalletClient({ account, chain: FUJI, transport: http(RPC_URL) });
}
