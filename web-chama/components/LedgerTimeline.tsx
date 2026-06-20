"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ScrollText } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";
import { VerifiedOnChain } from "./VerifiedOnChain";
import { Card } from "./ui/card";
import { formatAvax, relativeTime, truncateAddress } from "@/lib/format";
import { snowtraceAddress } from "@/lib/chama/config";
import type { Contribution, Member } from "@/lib/chama/types";

function resolveLabel(members: Member[], address: string): string {
  return (
    members.find((m) => m.address.toLowerCase() === address.toLowerCase())?.label ??
    truncateAddress(address)
  );
}

function LedgerItem({
  entry,
  label,
  index,
}: {
  entry: Contribution;
  label: string;
  index: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.05, 0.4) }}
      className="relative flex gap-4 pl-1"
    >
      <div className="relative z-10">
        <MemberAvatar address={entry.contributor} label={label} size="md" />
      </div>
      <div className="flex flex-1 items-start justify-between gap-3 border-b border-line/70 pb-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
            <span>{relativeTime(entry.timestamp)}</span>
            <span className="text-line-strong">·</span>
            <VerifiedOnChain />
            <a
              href={snowtraceAddress(entry.contributor)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-ink-faint transition-colors hover:text-primary"
            >
              Snowtrace
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
        <p className="shrink-0 font-mono text-sm font-semibold text-gold tnum">
          +{formatAvax(entry.amount)}
        </p>
      </div>
    </motion.li>
  );
}

export function LedgerTimeline({
  ledger,
  members,
}: {
  ledger: Contribution[];
  members: Member[];
}) {
  const ordered = [...ledger].sort((a, b) => Number(b.index - a.index));

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-tint text-primary">
            <ScrollText className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <h2 className="font-display text-base font-semibold text-ink">Daftari la michango</h2>
            <p className="text-xs text-ink-soft">Public on-chain ledger</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Hai
        </span>
      </div>

      {ordered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <ScrollText className="h-7 w-7 text-line-strong" />
          <p className="font-display text-base font-medium text-ink">Bado hakuna michango</p>
          <p className="max-w-xs text-sm text-ink-soft">
            Mchango wa kwanza utaonekana hapa, ukithibitishwa kwenye blockchain.
          </p>
        </div>
      ) : (
        <ol className="relative px-5 pt-5">
          <div className="absolute bottom-6 left-[2.45rem] top-6 w-px bg-line" aria-hidden />
          {ordered.map((entry, i) => (
            <LedgerItem
              key={entry.index.toString()}
              entry={entry}
              index={i}
              label={resolveLabel(members, entry.contributor)}
            />
          ))}
        </ol>
      )}
    </Card>
  );
}
