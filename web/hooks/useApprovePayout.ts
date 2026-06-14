"use client";

import { useCallback } from "react";
import { chamaContract } from "@/lib/chama/contract";
import { chamaGroupAbi } from "@/lib/chama/abi";
import { FUJI } from "@/lib/chama/config";
import { demoWalletClient } from "@/lib/chama/demo";
import { useTxRunner } from "./useTxRunner";

export function useApprovePayout(onConfirmed?: () => void) {
  const { runWith, write, isBusy } = useTxRunner();

  /// Approve with the connected wallet (the presenter, member 0).
  const approve = useCallback(
    (proposalId: bigint) =>
      runWith(
        () => write({ ...chamaContract, functionName: "approvePayout", args: [proposalId] }),
        {
          submitting: "Inatuma idhini...",
          pending: "Inasubiri uthibitisho...",
          success: "Umekubali pendekezo!",
        },
        onConfirmed,
      ),
    [runWith, write, onConfirmed],
  );

  /// Approve as a derived demo member (testnet only), so the 3-of-5 flow completes live.
  const approveAsDemo = useCallback(
    (proposalId: bigint, memberIndex: number, label: string) => {
      const client = demoWalletClient(memberIndex);
      if (!client || !client.account) return Promise.resolve(false);
      const account = client.account;
      return runWith(
        () =>
          client.writeContract({
            address: chamaContract.address,
            abi: chamaGroupAbi,
            functionName: "approvePayout",
            args: [proposalId],
            account,
            chain: FUJI,
          }),
        {
          submitting: `${label} anatuma idhini...`,
          pending: "Inasubiri uthibitisho...",
          success: `${label} amekubali!`,
        },
        onConfirmed,
      );
    },
    [runWith, onConfirmed],
  );

  return { approve, approveAsDemo, isBusy };
}
