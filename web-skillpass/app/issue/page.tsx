"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { IssueForm } from "@/components/IssueForm";
import { SetupNotice } from "@/components/SetupNotice";
import { IS_CONFIGURED } from "@/lib/skillpass/config";

export default function IssuePage() {
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
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <IssueForm onIssued={() => undefined} />
      </main>
    </div>
  );
}
