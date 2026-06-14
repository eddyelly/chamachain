import { ArrowUpRight } from "lucide-react";
import { AnimatedAmount } from "./AnimatedAmount";
import { Badge } from "./ui/badge";
import { CHAMA_ADDRESS, snowtraceAddress } from "@/lib/chama/config";
import { truncateAddress } from "@/lib/format";
import type { GroupInfo } from "@/lib/chama/types";

export function GroupHero({ info, ledgerCount }: { info: GroupInfo; ledgerCount: number }) {
  return (
    <section className="aura relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Hazina ya pamoja · Shared treasury
        </p>
        <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {info.name}
        </h1>
      </div>

      <div className="mt-7 flex items-end gap-2.5">
        <span className="font-display text-6xl font-semibold leading-[0.9] tracking-tight text-primary tnum sm:text-7xl">
          <AnimatedAmount wei={info.pooledBalance} />
        </span>
        <span className="mb-1.5 font-display text-2xl font-medium text-gold">AVAX</span>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Badge variant="gold" size="md">
          Idhini {info.threshold} / {info.memberCount} kutoa malipo
        </Badge>
        <Badge variant="teal" size="md">
          {info.memberCount} wanachama
        </Badge>
        <Badge variant="outline" size="md">
          {ledgerCount} michango
        </Badge>
        <a
          href={snowtraceAddress(CHAMA_ADDRESS)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-primary"
        >
          <span className="font-mono">{truncateAddress(CHAMA_ADDRESS)}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}
