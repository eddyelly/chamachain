import Link from "next/link";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { BatchStepper } from "./BatchStepper";
import { formatAvax } from "@/lib/format";
import { STATUS_LABELS, type Batch } from "@/lib/mazao/types";

function statusVariant(status: number): "teal" | "gold" | "success" | "outline" {
  if (status === 3) return "success";
  if (status === 2) return "gold";
  if (status === 4) return "outline";
  return "teal";
}

export function BatchCard({ batch }: { batch: Batch }) {
  return (
    <Link href={`/batch/${batch.id.toString()}`} className="block">
      <Card className="p-5 transition-shadow hover:shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Batch #{batch.id.toString()}
            </p>
            <h3 className="font-display text-lg font-semibold text-ink">
              {batch.crop} · {batch.quantityKg.toString()} kg
            </h3>
          </div>
          <Badge variant={statusVariant(batch.status)}>{STATUS_LABELS[batch.status]}</Badge>
        </div>
        <p className="mt-1 font-mono text-sm font-semibold text-gold tnum">
          {formatAvax(batch.price)} AVAX
        </p>
        <div className="mt-5">
          <BatchStepper status={batch.status} compact />
        </div>
      </Card>
    </Link>
  );
}
