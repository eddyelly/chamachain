import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 4C10 9 9 15 16 28C23 15 22 9 16 4Z" fill="var(--color-primary)" />
      <circle cx="16" cy="13" r="2.6" fill="var(--color-gold-bright)" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-ink">MazaoTrace</p>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint sm:block">
              Cashew, farm to market
            </p>
          </div>
        </Link>
        <ConnectWallet />
      </div>
    </header>
  );
}
