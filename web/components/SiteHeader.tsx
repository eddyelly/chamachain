import { ConnectWallet } from "./ConnectWallet";
import { NetworkPill } from "./NetworkPill";

function Emblem() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <circle cx="17" cy="17" r="16" stroke="var(--color-primary)" strokeWidth="1.5" />
      <circle cx="17" cy="17" r="10.5" stroke="var(--color-primary-bright)" strokeWidth="1.5" />
      <circle cx="17" cy="17" r="4.5" fill="var(--color-gold-bright)" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Emblem />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold tracking-tight text-ink">ChamaChain</p>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint sm:block">
              Akiba ya uwazi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <NetworkPill />
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
