"use client";

import { useCallback } from "react";
import { skillPassContract } from "@/lib/skillpass/contract";
import { useTxRunner } from "./useTxRunner";

export function useRevoke(onConfirmed?: () => void) {
  const { runWith, write, isBusy } = useTxRunner();

  const revoke = useCallback(
    (id: bigint) =>
      runWith(
        () => write({ ...skillPassContract, functionName: "revoke", args: [id] }),
        {
          submitting: "Revoking...",
          pending: "Waiting for confirmation...",
          success: "Credential revoked",
        },
        onConfirmed,
      ),
    [runWith, write, onConfirmed],
  );

  return { revoke, isBusy };
}
