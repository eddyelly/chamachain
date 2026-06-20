"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { VerifyPanel } from "@/components/VerifyPanel";
import { SetupNotice } from "@/components/SetupNotice";
import { IS_CONFIGURED } from "@/lib/skillpass/config";

export default function VerifyPage() {
  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-semibold text-ink">Verify a credential</h1>
        <VerifyPanel />
      </main>
    </div>
  );
}
