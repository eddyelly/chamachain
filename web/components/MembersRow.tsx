import { MemberAvatar } from "./MemberAvatar";
import { formatAvax } from "@/lib/format";
import type { Member } from "@/lib/chama/types";

export function MembersRow({ members, you }: { members: Member[]; you?: `0x${string}` }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        Wanachama · Members
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {members.map((m) => {
          const isYou = you ? m.address.toLowerCase() === you.toLowerCase() : false;
          return (
            <div
              key={m.address}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft"
            >
              <MemberAvatar address={m.address} label={m.label} size="md" ring={isYou} />
              <div className="min-w-0 leading-tight">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                  {m.label}
                  {isYou && (
                    <span className="rounded-full bg-gold-tint px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold">
                      Wewe
                    </span>
                  )}
                </p>
                <p className="truncate font-mono text-xs text-ink-soft tnum">
                  {formatAvax(m.total)} AVAX
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
