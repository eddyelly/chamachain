"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import { chamaContract } from "@/lib/chama/contract";
import { useTxRunner } from "./useTxRunner";

export function useProposePayout(onConfirmed?: () => void) {
  const { runWith, write, isBusy } = useTxRunner();

  const propose = useCallback(
    (recipient: `0x${string}`, amountEther: string, reason: string) =>
      runWith(
        () =>
          write({
            ...chamaContract,
            functionName: "proposePayout",
            args: [recipient, parseEther(amountEther), reason],
          }),
        {
          submitting: "Inawasilisha pendekezo...",
          pending: "Inasubiri uthibitisho wa mtandao...",
          success: "Pendekezo limewasilishwa!",
          description: "Wanachama sasa wanaweza kukubali",
        },
        onConfirmed,
      ),
    [runWith, write, onConfirmed],
  );

  return { propose, isBusy };
}
