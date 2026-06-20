"use client";

import { useReadContract } from "wagmi";
import { mazaoContract } from "@/lib/mazao/contract";
import { IS_CONFIGURED } from "@/lib/mazao/config";
import type { Batch } from "@/lib/mazao/types";

export function useBatches() {
  const query = useReadContract({
    ...mazaoContract,
    functionName: "getBatches",
    query: { enabled: IS_CONFIGURED, refetchInterval: 5000 },
  });
  return {
    batches: (query.data as Batch[] | undefined) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useBatch(id?: bigint) {
  const query = useReadContract({
    ...mazaoContract,
    functionName: "getBatch",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: IS_CONFIGURED && id !== undefined, refetchInterval: 5000 },
  });
  return {
    batch: query.data as Batch | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
