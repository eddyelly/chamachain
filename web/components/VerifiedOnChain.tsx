import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/// The subtle "verified on-chain" treatment that makes the ledger feel trustworthy.
export function VerifiedOnChain({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-success",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      Imethibitishwa
    </span>
  );
}
