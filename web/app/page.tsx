"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/SiteHeader";
import { NetworkBanner } from "@/components/NetworkBanner";
import { GroupHero } from "@/components/GroupHero";
import { MembersRow } from "@/components/MembersRow";
import { LedgerTimeline } from "@/components/LedgerTimeline";
import { ContributeCard } from "@/components/ContributeCard";
import { ProposalsPanel } from "@/components/ProposalsPanel";
import { ReleaseCelebration } from "@/components/ReleaseCelebration";
import { SetupNotice } from "@/components/SetupNotice";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useGroupData } from "@/hooks/useGroupData";
import { useNetwork } from "@/hooks/useNetwork";
import { IS_CONFIGURED } from "@/lib/chama/config";
import { truncateAddress } from "@/lib/format";

interface Celebration {
  recipientLabel: string;
  amount: bigint;
}

export default function Home() {
  const { address, isConnected, isFuji } = useNetwork();
  const { info, members, ledger, proposals, approversByProposal, isLoading, isError, refetch } =
    useGroupData();

  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const seenExecuted = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const onConfirmed = useCallback(() => refetch(), [refetch]);

  // Celebrate a payout the moment a proposal transitions to executed, without re-celebrating
  // proposals that were already executed when the page first loaded.
  useEffect(() => {
    if (isLoading || !info) return;
    const executed = proposals.filter((p) => p.executed);
    if (!initialized.current) {
      executed.forEach((p) => seenExecuted.current.add(p.id.toString()));
      initialized.current = true;
      return;
    }
    const fresh = executed.filter((p) => !seenExecuted.current.has(p.id.toString()));
    fresh.forEach((p) => seenExecuted.current.add(p.id.toString()));
    if (fresh.length > 0) {
      const p = fresh[fresh.length - 1];
      const label =
        members.find((m) => m.address.toLowerCase() === p.recipient.toLowerCase())?.label ??
        truncateAddress(p.recipient);
      setCelebration({ recipientLabel: label, amount: p.amount });
    }
  }, [proposals, members, isLoading, info]);

  const isMember = address
    ? members.some((m) => m.address.toLowerCase() === address.toLowerCase())
    : false;
  const canAct = isConnected && isFuji && isMember;

  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <NetworkBanner />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {isLoading && !info ? (
            <DashboardSkeleton />
          ) : info ? (
            <div className="flex flex-col gap-5 sm:gap-6">
              <GroupHero info={info} ledgerCount={ledger.length} />
              <MembersRow members={members} you={address} />

              <div className="grid gap-5 lg:grid-cols-12">
                <div className="flex flex-col gap-5 lg:order-2 lg:col-span-5">
                  <ContributeCard
                    isConnected={isConnected}
                    isFuji={isFuji}
                    isMember={isMember}
                    onConfirmed={onConfirmed}
                  />
                  <ProposalsPanel
                    proposals={proposals}
                    members={members}
                    approversByProposal={approversByProposal}
                    threshold={info.threshold}
                    connectedAddress={address}
                    canActConnected={canAct}
                    canPropose={canAct}
                    onConfirmed={onConfirmed}
                  />
                </div>
                <div className="lg:order-1 lg:col-span-7">
                  <LedgerTimeline ledger={ledger} members={members} />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-7 text-center shadow-soft">
              <p className="font-display text-lg font-semibold text-ink">Imeshindwa kupakia data</p>
              <p className="mt-2 text-sm text-ink-soft">
                {isError
                  ? "Hakikisha anwani ya mkataba ni sahihi na imewekwa kwenye Fuji."
                  : "Inapakia data ya kikundi..."}
              </p>
            </div>
          )}
        </main>

        <footer className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="woven-rule mb-4" />
          <p className="text-center text-xs text-ink-faint">
            ChamaChain · Akiba ya uwazi kwenye Avalanche Fuji testnet
          </p>
        </footer>
      </div>

      <ReleaseCelebration
        open={celebration !== null}
        recipientLabel={celebration?.recipientLabel ?? ""}
        amount={celebration?.amount ?? 0n}
        onClose={() => setCelebration(null)}
      />
    </TooltipProvider>
  );
}
