"use client";

import { use } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CredentialCard } from "@/components/CredentialCard";
import { SetupNotice } from "@/components/SetupNotice";
import { useCertificatesOf } from "@/hooks/useCertificates";
import { IS_CONFIGURED } from "@/lib/skillpass/config";
import { truncate } from "@/lib/format";

export default function PassportPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const holder = address as `0x${string}`;
  const { certificates, isLoading } = useCertificatesOf(holder);

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Skill passport
        </p>
        <h1 className="mt-1 font-mono text-xl font-semibold text-ink">{truncate(holder, 10, 8)}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {certificates.length} credential{certificates.length === 1 ? "" : "s"} held by this wallet
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-ink-soft">Loading credentials...</p>
        ) : certificates.length === 0 ? (
          <p className="mt-8 text-sm text-ink-soft">This wallet holds no credentials yet.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {certificates.map((c) => (
              <CredentialCard key={c.id.toString()} certificate={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
