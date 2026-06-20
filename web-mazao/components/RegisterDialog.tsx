"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { useBatchActions } from "@/hooks/useBatchActions";
import { DEMO_ENABLED } from "@/lib/mazao/demo";

export function RegisterDialog({ onConfirmed }: { onConfirmed: () => void }) {
  const [open, setOpen] = useState(false);
  const [crop, setCrop] = useState("Cashew");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("0.0004");
  const { register, isBusy } = useBatchActions(onConfirmed);

  const valid = crop.trim().length > 0 && Number(qty) > 0 && Number(price) > 0;

  async function submit() {
    if (!valid) return;
    const ok = await register(crop.trim(), BigInt(Math.floor(Number(qty))), price);
    if (ok) {
      setOpen(false);
      setQty("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="md" disabled={!DEMO_ENABLED}>
          <Plus className="h-4 w-4" />
          Register batch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a cashew batch</DialogTitle>
          <DialogDescription>The farmer registers a batch for sale. A QR is generated for traceability.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Crop</label>
            <Input value={crop} onChange={(e) => setCrop(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Quantity (kg)</label>
            <Input inputMode="numeric" placeholder="50" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))} className="font-mono tnum" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Price (AVAX)</label>
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} className="font-mono tnum" />
          </div>
          <Button onClick={submit} disabled={!valid || isBusy} size="lg" className="mt-1 w-full">
            {isBusy ? "Registering..." : "Register batch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
