"use client";

import { useNetwork } from "@/hooks/useNetwork";

export function NetworkPill() {
  const { isConnected, isFuji } = useNetwork();
  if (!isConnected) return null;

  return (
    <span
      className={
        isFuji
          ? "hidden items-center gap-1.5 rounded-full bg-primary-tint px-3 py-1.5 text-xs font-medium text-primary-deep sm:inline-flex"
          : "hidden items-center gap-1.5 rounded-full bg-gold-tint px-3 py-1.5 text-xs font-medium text-gold sm:inline-flex"
      }
    >
      <span className={isFuji ? "h-2 w-2 rounded-full bg-success" : "h-2 w-2 rounded-full bg-clay"} />
      {isFuji ? "Fuji C-Chain" : "Mtandao usio sahihi"}
    </span>
  );
}
