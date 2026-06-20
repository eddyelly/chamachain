"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { ApprovalRing } from "./ApprovalRing";
import { MemberAvatar } from "./MemberAvatar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { formatAvax, truncateAddress } from "@/lib/format";
import { snowtraceAddress } from "@/lib/chama/config";
import { DEMO_ENABLED, demoIndexOf } from "@/lib/chama/demo";
import { useApprovePayout } from "@/hooks/useApprovePayout";
import type { Member, Proposal } from "@/lib/chama/types";

function labelOf(members: Member[], address: string): string {
  return (
    members.find((m) => m.address.toLowerCase() === address.toLowerCase())?.label ??
    truncateAddress(address)
  );
}

export function ProposalCard({
  proposal,
  members,
  approvers,
  threshold,
  connectedAddress,
  canActConnected,
  onConfirmed,
}: {
  proposal: Proposal;
  members: Member[];
  approvers: `0x${string}`[];
  threshold: number;
  connectedAddress?: `0x${string}`;
  canActConnected: boolean;
  onConfirmed: () => void;
}) {
  const { approve, approveAsDemo, isBusy } = useApprovePayout(onConfirmed);

  const approvedSet = new Set(approvers.map((a) => a.toLowerCase()));
  const approvedCount = Number(proposal.approvalCount);
  const remaining = Math.max(0, threshold - approvedCount);
  const recipientLabel = labelOf(members, proposal.recipient);

  const pending = members.filter((m) => !approvedSet.has(m.address.toLowerCase()));

  return (
    <Card className={cn("p-5", proposal.executed && "ring-1 ring-success/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <MemberAvatar address={proposal.recipient} label={recipientLabel} size="md" />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Malipo kwa · Payout to
            </p>
            <p className="font-semibold text-ink">{recipientLabel}</p>
          </div>
        </div>
        <p className="shrink-0 font-mono text-xl font-semibold text-gold tnum">
          {formatAvax(proposal.amount)} AVAX
        </p>
      </div>

      <p className="mt-3 rounded-lg bg-cream px-3 py-2 text-sm italic text-ink-soft">
        &ldquo;{proposal.reason}&rdquo;
      </p>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
        <ApprovalRing
          approved={approvedCount}
          threshold={threshold}
          executed={proposal.executed}
          size={112}
        />

        <div className="w-full flex-1">
          {proposal.executed ? (
            <Badge variant="success" size="md" className="mb-3">
              <Check className="h-3.5 w-3.5" />
              Malipo yametolewa
            </Badge>
          ) : (
            <p className="mb-3 text-sm font-medium text-ink">
              {remaining === 0 ? (
                "Imefikia idadi, inatolewa..."
              ) : (
                <>
                  <span className="font-semibold text-clay">{remaining}</span> idhini zaidi
                  zinahitajika
                </>
              )}
            </p>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            {members.map((m) => {
              const approved = approvedSet.has(m.address.toLowerCase());
              return (
                <div key={m.address} className="relative">
                  <MemberAvatar
                    address={m.address}
                    label={m.label}
                    size="sm"
                    ring={approved}
                    className={approved ? undefined : "opacity-35"}
                  />
                  {approved && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-success text-cream ring-2 ring-surface">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {!proposal.executed && (
            <div className="flex flex-wrap gap-2">
              {pending.map((m) => {
                const isConnectedMember =
                  connectedAddress &&
                  m.address.toLowerCase() === connectedAddress.toLowerCase();

                if (isConnectedMember && canActConnected) {
                  return (
                    <Button
                      key={m.address}
                      variant="primary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void approve(proposal.id)}
                    >
                      Kubali (wewe)
                    </Button>
                  );
                }

                const demoIndex = demoIndexOf(m.address);
                if (DEMO_ENABLED && demoIndex !== null) {
                  return (
                    <Button
                      key={m.address}
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void approveAsDemo(proposal.id, demoIndex, m.label)}
                    >
                      Kubali kama {m.label}
                    </Button>
                  );
                }
                return null;
              })}
            </div>
          )}

          {proposal.executed && (
            <a
              href={snowtraceAddress(proposal.recipient)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-primary"
            >
              Thibitisha kwenye Snowtrace
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ProposalCardMotion(props: Parameters<typeof ProposalCard>[0]) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <ProposalCard {...props} />
    </motion.div>
  );
}
