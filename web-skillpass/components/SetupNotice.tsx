import { Terminal } from "lucide-react";
import { Card } from "./ui/card";

export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="p-7">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-tint text-primary">
            <Terminal className="h-5 w-5" />
          </span>
          <h1 className="font-display text-xl font-semibold text-ink">Welcome to SkillPass TZ</h1>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          No contract is configured yet. Run <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">npm run deploy:skillpass</code>, then set
          <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_SKILLPASS_ADDRESS</code> in
          <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">web-skillpass/.env.local</code> and restart.
        </p>
      </Card>
    </div>
  );
}
