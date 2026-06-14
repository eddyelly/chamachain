"use client";

import { AlertTriangle } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { Button } from "./ui/button";

export function NetworkBanner() {
  const { isConnected, isFuji, switchToFuji, isSwitching } = useNetwork();
  if (!isConnected || isFuji) return null;

  return (
    <div className="border-b border-clay/30 bg-clay-tint/70">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2 text-sm font-medium text-clay">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Uko kwenye mtandao usio sahihi. Badili kwenda Avalanche Fuji ili kuendelea.
        </p>
        <Button variant="gold" size="sm" onClick={switchToFuji} disabled={isSwitching}>
          {isSwitching ? "Inabadili..." : "Badili kwenda Fuji"}
        </Button>
      </div>
    </div>
  );
}
