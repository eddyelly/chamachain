"use client";

import { useState } from "react";
import { Award } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FileHashDrop } from "./FileHashDrop";
import { useIssueCertificate } from "@/hooks/useIssueCertificate";
import { demoStudentAddress, DEMO_ENABLED } from "@/lib/skillpass/demo";
import { useNetwork } from "@/hooks/useNetwork";

export function IssueForm({ onIssued }: { onIssued: () => void }) {
  const { isConnected, isFuji } = useNetwork();
  const { issueConnected, issueAsInstitution, isBusy } = useIssueCertificate(onIssued);

  const [student, setStudent] = useState("");
  const [course, setCourse] = useState("");
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [fileName, setFileName] = useState("");

  const valid = /^0x[0-9a-fA-F]{40}$/.test(student) && course.trim().length > 0 && hash !== null;

  async function submit(asInstitution: boolean) {
    if (!valid || hash === null) return;
    const recipient = student as `0x${string}`;
    const ok = asInstitution
      ? await issueAsInstitution(recipient, course.trim(), fileName, hash)
      : await issueConnected(recipient, course.trim(), fileName, hash);
    if (ok) {
      setStudent("");
      setCourse("");
      setHash(null);
      setFileName("");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-tint text-primary">
          <Award className="h-5 w-5" />
        </span>
        <h2 className="font-display text-lg font-semibold text-ink">Issue a credential</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Student wallet
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="0x..."
              value={student}
              onChange={(e) => setStudent(e.target.value.trim())}
              className="font-mono text-sm"
            />
            {DEMO_ENABLED && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStudent(demoStudentAddress(1))}>
                  Asha
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStudent(demoStudentAddress(2))}>
                  Juma
                </Button>
              </>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Course
          </label>
          <Input
            placeholder="Solidity Bootcamp 2026"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          />
        </div>
        <FileHashDrop onHash={(h, name) => { setHash(h); setFileName(name); }} />

        <Button
          size="lg"
          className="mt-1 w-full"
          disabled={!valid || isBusy || !isConnected || !isFuji}
          onClick={() => void submit(false)}
        >
          {isBusy ? "Issuing..." : "Issue with connected wallet"}
        </Button>
        {DEMO_ENABLED && (
          <Button
            variant="outline"
            size="md"
            className="w-full"
            disabled={!valid || isBusy}
            onClick={() => void submit(true)}
          >
            Issue as the institution (demo)
          </Button>
        )}
      </div>
    </Card>
  );
}
