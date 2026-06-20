import { avalancheFuji } from "wagmi/chains";

export const FUJI = avalancheFuji;
export const FUJI_CHAIN_ID = avalancheFuji.id; // 43113

/// The deployed ChamaGroup address, injected at build time. Empty until you deploy and
/// set NEXT_PUBLIC_CHAMA_ADDRESS in web/.env.local. The app shows a setup state when missing.
const rawAddress = process.env.NEXT_PUBLIC_CHAMA_ADDRESS ?? "";
export const CHAMA_ADDRESS = rawAddress as `0x${string}`;
export const IS_CONFIGURED = /^0x[0-9a-fA-F]{40}$/.test(rawAddress);

export const SNOWTRACE_BASE = "https://testnet.snowtrace.io";

export function snowtraceTx(hash: string): string {
  return `${SNOWTRACE_BASE}/tx/${hash}`;
}

export function snowtraceAddress(address: string): string {
  return `${SNOWTRACE_BASE}/address/${address}`;
}
