"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { FUJI_CHAIN_ID } from "@/lib/chama/config";

export interface NetworkState {
  address?: `0x${string}`;
  isConnected: boolean;
  chainId: number;
  isFuji: boolean;
  switchToFuji: () => void;
  isSwitching: boolean;
}

export function useNetwork(): NetworkState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  return {
    address,
    isConnected,
    chainId,
    isFuji: chainId === FUJI_CHAIN_ID,
    switchToFuji: () => switchChain({ chainId: FUJI_CHAIN_ID }),
    isSwitching: isPending,
  };
}
