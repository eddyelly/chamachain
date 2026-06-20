"use client";

import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/SiteHeader";
import { VerifyPanel } from "@/components/VerifyPanel";
import { SetupNotice } from "@/components/SetupNotice";
import { IS_CONFIGURED } from "@/lib/skillpass/config";

export default function Home() {
  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <section className="mb-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Verifiable credentials on-chain
            </p>
            <h1 className="mt-2 text-balance font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Prove a certificate is genuine in seconds
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
              Institutions issue soulbound credentials to a student wallet. Anyone can verify them.
              The file stays private, only its hash lives on-chain.
            </p>
            <div className="mt-4 flex justify-center gap-2 text-sm">
              <Link href="/issue" className="rounded-full bg-primary px-4 py-2 font-medium text-base text-[var(--color-base)]">
                Issue
              </Link>
              <Link href="/verify" className="rounded-full border border-line-strong px-4 py-2 font-medium text-ink">
                Verify
              </Link>
            </div>
          </section>
          <VerifyPanel />
        </main>
      </div>
    </TooltipProvider>
  );
}
