import { Terminal } from "lucide-react";
import { Card } from "./ui/card";

/// Shown when NEXT_PUBLIC_CHAMA_ADDRESS is missing, so the app explains itself instead of
/// rendering an empty dashboard.
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="p-7">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-tint text-primary">
            <Terminal className="h-5 w-5" />
          </span>
          <h1 className="font-display text-xl font-semibold text-ink">Karibu ChamaChain</h1>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          No group is configured yet. Deploy the contract to Fuji, then point the app at it.
        </p>
        <ol className="mt-5 flex flex-col gap-3 text-sm text-ink">
          <li className="flex gap-3">
            <span className="font-mono text-xs text-ink-faint">1</span>
            <span>
              From the project root, run <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs">npm run deploy:fuji</code> and copy the printed address.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-ink-faint">2</span>
            <span>
              In <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs">web/.env.local</code>, set{" "}
              <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_CHAMA_ADDRESS</code> to that address.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-ink-faint">3</span>
            <span>Restart the dev server. The dashboard will load with the group ledger.</span>
          </li>
        </ol>
      </Card>
    </div>
  );
}
