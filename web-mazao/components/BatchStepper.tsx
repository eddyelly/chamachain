import { Check, Sprout, Wallet, Truck, PackageCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Registered", icon: Sprout },
  { label: "Funded", icon: Wallet },
  { label: "In transit", icon: Truck },
  { label: "Delivered", icon: PackageCheck },
] as const;


export function BatchStepper({ status, compact = false }: { status: number; compact?: boolean }) {
  const cancelled = status === 4;
  const reached = cancelled ? 1 : status; 
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= reached && !(cancelled && i > 1);
        const Icon = cancelled && i === 1 ? XCircle : step.icon;
        return (
          <div key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid place-items-center rounded-full border-2 transition-colors",
                  compact ? "h-7 w-7" : "h-10 w-10",
                  cancelled && i === 1
                    ? "border-danger bg-danger text-cream"
                    : done
                      ? "border-primary bg-primary text-cream"
                      : "border-line-strong bg-surface text-ink-faint",
                )}
              >
                {done && !(cancelled && i === 1) ? (
                  <Check className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} strokeWidth={2.5} />
                ) : (
                  <Icon className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} />
                )}
              </span>
              {!compact && (
                <span className={cn("text-xs font-medium", done ? "text-ink" : "text-ink-faint")}>
                  {step.label}
                </span>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-1.5 h-0.5 flex-1 sm:mx-2">
                <div className={cn("h-full", i < reached && !cancelled ? "bg-primary" : "route-line")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
