import { Database, FileLock2 } from "lucide-react";
import type { Certificate } from "@/lib/skillpass/types";
import { truncate } from "@/lib/format";

export function OnChainOffChainPanel({ certificate }: { certificate: Certificate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-surface-sunk p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Database className="h-3.5 w-3.5" /> On-chain
        </p>
        <dl className="space-y-1 text-sm text-ink">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">Course</dt>
            <dd className="font-medium">{certificate.course}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">File hash</dt>
            <dd className="font-mono text-xs">{truncate(certificate.fileHash, 8, 6)}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-xl border border-line bg-surface-sunk p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <FileLock2 className="h-3.5 w-3.5" /> Off-chain
        </p>
        <p className="text-sm text-ink">
          The file <span className="font-medium">{certificate.fileName}</span> stays with the
          holder. Only its hash is stored on-chain, so anyone can prove a file matches without the
          file being public.
        </p>
      </div>
    </div>
  );
}
