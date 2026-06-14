"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import { chamaContract } from "@/lib/chama/contract";
import { useTxRunner } from "./useTxRunner";

export function useContribute(onConfirmed?: () => void) {
  const { runWith, write, isBusy } = useTxRunner();

  const contribute = useCallback(
    (amountEther: string) =>
      runWith(
        () =>
          write({
            ...chamaContract,
            functionName: "contribute",
            value: parseEther(amountEther),
          }),
        {
          submitting: "Inatuma mchango...",
          pending: "Inasubiri uthibitisho wa mtandao...",
          success: "Mchango umepokelewa!",
          description: `Umechangia ${amountEther} AVAX, imethibitishwa kwenye Fuji`,
        },
        onConfirmed,
      ),
    [runWith, write, onConfirmed],
  );

  return { contribute, isBusy };
}
