"use client";

import { Button } from "./ui/button";
import { useBatchActions } from "@/hooks/useBatchActions";
import { DEMO_ENABLED } from "@/lib/mazao/demo";
import type { Batch } from "@/lib/mazao/types";

/// Demo-driven action panel: shows the action(s) valid for the batch's current status, each
/// performed by the correct role via the demo signer.
export function BatchActions({ batch, onConfirmed }: { batch: Batch; onConfirmed: () => void }) {
  const { purchase, pickup, deliver, cancel, isBusy } = useBatchActions(onConfirmed);

  if (!DEMO_ENABLED) {
    return <p className="text-sm text-ink-soft">Demo signing is off. Set NEXT_PUBLIC_DEMO_MNEMONIC to drive the flow.</p>;
  }

  if (batch.status === 0) {
    return (
      <Button variant="gold" size="lg" className="w-full" disabled={isBusy} onClick={() => void purchase(batch.id, batch.price)}>
        Buyer: purchase and fund escrow
      </Button>
    );
  }
  if (batch.status === 1) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" className="w-full" disabled={isBusy} onClick={() => void pickup(batch.id)}>
          Transporter: confirm pickup
        </Button>
        <Button variant="ghost" size="md" className="w-full" disabled={isBusy} onClick={() => void cancel(batch.id)}>
          Cancel and refund the buyer
        </Button>
      </div>
    );
  }
  if (batch.status === 2) {
    return (
      <Button variant="gold" size="lg" className="w-full" disabled={isBusy} onClick={() => void deliver(batch.id)}>
        Buyer: confirm delivery and release payment
      </Button>
    );
  }
  return null;
}
