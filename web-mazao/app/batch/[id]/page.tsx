"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BatchStepper } from "@/components/BatchStepper";
import { BatchQr } from "@/components/BatchQr";
import { BatchActions } from "@/components/BatchActions";
import { DeliveredCelebration } from "@/components/DeliveredCelebration";
import { SetupNotice } from "@/components/SetupNotice";
import { Card } from "@/components/ui/card";
import { useBatch } from "@/hooks/useBatches";
import { IS_CONFIGURED, snowtraceAddress } from "@/lib/mazao/config";
import { formatAvax, truncate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/mazao/types";

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  let batchId: bigint | undefined;
  try {
    batchId = BigInt(id);
  } catch {
    batchId = undefined;
  }
  const { batch, isLoading, isError, refetch } = useBatch(batchId);

  const [celebrate, setCelebrate] = useState(false);
  const wasInTransit = useRef(false);

  // Celebrate the transition into Delivered (status 3) that this page observes.
  useEffect(() => {
    if (!batch) return;
    if (batch.status === 2) wasInTransit.current = true;
    if (batch.status === 3 && wasInTransit.current) {
      wasInTransit.current = false;
      setCelebrate(true);
    }
  }, [batch]);

  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> All batches
        </Link>

        {isError || (!isLoading && !batch) ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-danger">No batch #{id} found.</p>
          </Card>
        ) : !batch ? (
          <p className="text-sm text-ink-soft">Loading batch...</p>
        ) : (
          <div className="flex flex-col gap-5">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Batch #{batch.id.toString()} · {STATUS_LABELS[batch.status]}
                  </p>
                  <h1 className="font-display text-2xl font-semibold text-ink">
                    {batch.crop} · {batch.quantityKg.toString()} kg
                  </h1>
                  <p className="mt-1 font-mono text-lg font-semibold text-gold tnum">
                    {formatAvax(batch.price)} AVAX
                  </p>
                </div>
                <BatchQr id={batch.id} />
              </div>

              <div className="mt-7">
                <BatchStepper status={batch.status} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Parties</h2>
              <dl className="space-y-2 text-sm">
                <Party label="Farmer" value={batch.farmer} />
                <Party label="Buyer" value={batch.buyer} />
                <Party label="Transporter" value={batch.transporter} />
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Action</h2>
              <BatchActions batch={batch} onConfirmed={refetch} />
            </Card>
          </div>
        )}
      </main>

      <DeliveredCelebration
        open={celebrate}
        amount={batch?.price ?? 0n}
        onClose={() => setCelebrate(false)}
      />
    </div>
  );
}

function Party({ label, value }: { label: string; value: `0x${string}` }) {
  const empty = /^0x0{40}$/.test(value);
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-soft">{label}</dt>
      {empty ? (
        <dd className="text-ink-faint">not assigned</dd>
      ) : (
        <dd>
          <a
            href={snowtraceAddress(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-ink transition-colors hover:text-primary"
          >
            {truncate(value)}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </dd>
      )}
    </div>
  );
}
