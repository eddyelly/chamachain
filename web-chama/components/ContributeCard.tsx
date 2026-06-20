"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useContribute } from "@/hooks/useContribute";

const QUICK = ["0.01", "0.05", "0.1"];

export function ContributeCard({
  isConnected,
  isFuji,
  isMember,
  onConfirmed,
}: {
  isConnected: boolean;
  isFuji: boolean;
  isMember: boolean;
  onConfirmed: () => void;
}) {
  const [amount, setAmount] = useState("");
  const { contribute, isBusy } = useContribute(onConfirmed);

  const canContribute = isConnected && isFuji && isMember;
  const parsed = Number(amount);
  const validAmount = amount.length > 0 && Number.isFinite(parsed) && parsed > 0;

  const hint = !isConnected
    ? "Unganisha pochi yako ili kuchangia."
    : !isFuji
      ? "Badili kwenda mtandao wa Fuji."
      : !isMember
        ? "Akaunti hii si mwanachama wa kikundi hiki."
        : null;

  async function submit() {
    if (!validAmount || !canContribute) return;
    const ok = await contribute(amount);
    if (ok) setAmount("");
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-tint text-gold">
          <HandCoins className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <h2 className="font-display text-base font-semibold text-ink">Weka mchango</h2>
          <p className="text-xs text-ink-soft">Contribute to the pool</p>
        </div>
      </div>

      <div className="relative">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          disabled={!canContribute || isBusy}
          className="pr-16 font-mono text-lg tnum"
          aria-label="Kiasi cha mchango kwa AVAX"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-faint">
          AVAX
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setAmount(q)}
            disabled={!canContribute || isBusy}
            className="flex-1 rounded-lg border border-line bg-cream py-2 font-mono text-xs font-medium text-ink-soft transition-colors hover:border-primary-bright/40 hover:text-primary disabled:opacity-50 tnum"
          >
            {q}
          </button>
        ))}
      </div>

      <Button
        variant="gold"
        size="lg"
        className="mt-4 w-full"
        onClick={submit}
        disabled={!canContribute || !validAmount || isBusy}
      >
        {isBusy ? "Inatuma..." : "Changia sasa"}
      </Button>

      {hint && <p className="mt-3 text-center text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}
