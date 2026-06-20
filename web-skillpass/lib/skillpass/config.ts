import { avalancheFuji } from "wagmi/chains";

export const FUJI = avalancheFuji;
export const FUJI_CHAIN_ID = avalancheFuji.id;

const rawAddress = process.env.NEXT_PUBLIC_SKILLPASS_ADDRESS ?? "";
export const SKILLPASS_ADDRESS = rawAddress as `0x${string}`;
export const IS_CONFIGURED = /^0x[0-9a-fA-F]{40}$/.test(rawAddress);

export const SNOWTRACE_BASE = "https://testnet.snowtrace.io";
export const snowtraceTx = (h: string) => `${SNOWTRACE_BASE}/tx/${h}`;
export const snowtraceAddress = (a: string) => `${SNOWTRACE_BASE}/address/${a}`;
