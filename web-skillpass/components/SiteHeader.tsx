import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3" y="5" width="26" height="22" rx="4" stroke="var(--color-primary)" strokeWidth="1.6" />
      <circle cx="11" cy="13" r="3.4" fill="var(--color-violet)" />
      <path d="M18 11.5h7M18 16h7M7 21h18" stroke="var(--color-primary-bright)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-ink">SkillPass TZ</p>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint sm:block">
              Verifiable credentials
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <Link href="/verify" className="hidden rounded-full px-3 py-1.5 hover:bg-surface-sunk sm:block">
            Verify
          </Link>
          <Link href="/issue" className="hidden rounded-full px-3 py-1.5 hover:bg-surface-sunk sm:block">
            Issue
          </Link>
          <ConnectWallet />
        </nav>
      </div>
    </header>
  );
}
