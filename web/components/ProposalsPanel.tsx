"use client";

import { Landmark } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { ProposalCardMotion } from "./ProposalCard";
import { ProposeDialog } from "./ProposeDialog";
import type { Member, Proposal } from "@/lib/chama/types";

export function ProposalsPanel({
  proposals,
  members,
  approversByProposal,
  threshold,
  connectedAddress,
  canActConnected,
  canPropose,
  onConfirmed,
}: {
  proposals: Proposal[];
  members: Member[];
  approversByProposal: Record<string, `0x${string}`[]>;
  threshold: number;
  connectedAddress?: `0x${string}`;
  canActConnected: boolean;
  canPropose: boolean;
  onConfirmed: () => void;
}) {
  const ordered = [...proposals].sort((a, b) => Number(b.id - a.id));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold text-ink">Maombi ya malipo</h2>
        </div>
        <ProposeDialog members={members} canPropose={canPropose} onConfirmed={onConfirmed} />
      </div>

      {ordered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
          <Landmark className="h-7 w-7 text-line-strong" />
          <p className="font-display text-base font-medium text-ink">Hakuna maombi bado</p>
          <p className="max-w-xs text-sm text-ink-soft">
            Pendekeza malipo kutoka kwenye hazina. Yatatolewa tu baada ya idhini {threshold} kati
            ya {members.length}.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {ordered.map((p) => (
              <ProposalCardMotion
                key={p.id.toString()}
                proposal={p}
                members={members}
                approvers={approversByProposal[p.id.toString()] ?? []}
                threshold={threshold}
                connectedAddress={connectedAddress}
                canActConnected={canActConnected}
                onConfirmed={onConfirmed}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
