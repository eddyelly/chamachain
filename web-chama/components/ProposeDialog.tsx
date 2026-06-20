"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MemberAvatar } from "./MemberAvatar";
import { cn } from "@/lib/utils";
import { useProposePayout } from "@/hooks/useProposePayout";
import type { Member } from "@/lib/chama/types";

export function ProposeDialog({
  members,
  canPropose,
  onConfirmed,
}: {
  members: Member[];
  canPropose: boolean;
  onConfirmed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState<`0x${string}` | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { propose, isBusy } = useProposePayout(onConfirmed);

  const parsed = Number(amount);
  const valid = recipient !== null && parsed > 0 && reason.trim().length > 0;

  async function submit() {
    if (!valid || recipient === null) return;
    const ok = await propose(recipient, amount, reason.trim());
    if (ok) {
      setOpen(false);
      setRecipient(null);
      setAmount("");
      setReason("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="subtle" size="sm" disabled={!canPropose}>
          <Send className="h-4 w-4" />
          Pendekeza
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pendekeza malipo</DialogTitle>
          <DialogDescription>
            Propose a payout from the shared pool. Members approve before funds release.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Mpokeaji · Recipient
            </label>
            <div className="grid grid-cols-1 gap-2">
              {members.map((m) => {
                const selected = recipient === m.address;
                return (
                  <button
                    key={m.address}
                    type="button"
                    onClick={() => setRecipient(m.address)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary-tint"
                        : "border-line bg-cream hover:border-primary-bright/40",
                    )}
                  >
                    <MemberAvatar address={m.address} label={m.label} size="sm" />
                    <span className="text-sm font-medium text-ink">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Kiasi · Amount
            </label>
            <div className="relative">
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="pr-16 font-mono tnum"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-faint">
                AVAX
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Sababu · Reason
            </label>
            <Input
              placeholder="Mkopo wa biashara, ada ya shule..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={80}
            />
          </div>

          <Button onClick={submit} disabled={!valid || isBusy} className="mt-1 w-full" size="lg">
            {isBusy ? "Inawasilisha..." : "Wasilisha pendekezo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
