"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { snowtraceTx } from "@/lib/mazao/config";
import { getErrorMessage } from "@/lib/errors";

export interface TxCopy {
  submitting: string;
  pending: string;
  success: string;
  description?: string;
}

/// Centralizes the submitted -> pending -> confirmed/failed toast lifecycle so every write
/// behaves identically. `runWith` takes any function returning a tx hash; callers build the
/// write inline (with the connected wallet via `write`, or with a demo-signer wallet client)
/// so wagmi/viem can fully infer argument types.
export function useTxRunner() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [isBusy, setIsBusy] = useState(false);

  const runWith = useCallback(
    async (
      send: () => Promise<`0x${string}`>,
      copy: TxCopy,
      onConfirmed?: (hash: `0x${string}`) => void,
    ): Promise<boolean> => {
      if (!publicClient) {
        toast.error("Mtandao haupatikani (no provider)");
        return false;
      }
      const id = toast.loading(copy.submitting);
      setIsBusy(true);
      try {
        const hash = await send();
        toast.loading(copy.pending, { id });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          toast.success(copy.success, {
            id,
            description: copy.description ?? "Imethibitishwa kwenye Fuji",
            action: {
              label: "Snowtrace",
              onClick: () => window.open(snowtraceTx(hash), "_blank", "noopener"),
            },
          });
          onConfirmed?.(hash);
          return true;
        }
        toast.error("Muamala umeshindwa (transaction failed)", { id });
        return false;
      } catch (error) {
        toast.error(getErrorMessage(error), { id });
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [publicClient],
  );

  return { runWith, write: writeContractAsync, isBusy };
}
