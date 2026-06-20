import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { avalancheFuji } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "mazaotrace_demo";
const rpcUrl = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? avalancheFuji.rpcUrls.default.http[0];

/// Single supported chain: Avalanche Fuji. Anything else is treated as the wrong network.
export const wagmiConfig = getDefaultConfig({
  appName: "MazaoTrace",
  projectId,
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http(rpcUrl),
  },
  ssr: true,
});
