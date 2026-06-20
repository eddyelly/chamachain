"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { BatchCard } from "@/components/BatchCard";
import { RegisterDialog } from "@/components/RegisterDialog";
import { SetupNotice } from "@/components/SetupNotice";
import { useBatches } from "@/hooks/useBatches";
import { IS_CONFIGURED } from "@/lib/mazao/config";

export default function Home() {
  const { batches, isLoading, refetch } = useBatches();

  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }

  const ordered = [...batches].sort((a, b) => Number(b.id - a.id));

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Farm to market, on-chain
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Cashew batches
            </h1>
          </div>
          <RegisterDialog onConfirmed={refetch} />
        </div>

        {isLoading && batches.length === 0 ? (
          <p className="text-sm text-ink-soft">Loading batches...</p>
        ) : ordered.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
            <p className="font-display text-base font-medium text-ink">No batches yet</p>
            <p className="mt-1 text-sm text-ink-soft">Register the first cashew batch to start the journey.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((b) => (
              <BatchCard key={b.id.toString()} batch={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
