import { BadgeCheck, Ban } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { truncate, formatDate } from "@/lib/format";
import { snowtraceAddress } from "@/lib/skillpass/config";
import type { Certificate } from "@/lib/skillpass/types";

export function CredentialCard({ certificate }: { certificate: Certificate }) {
  const revoked = certificate.revoked;
  return (
    <Card className="overflow-hidden">
      <div className="foil h-1.5 w-full" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Credential #{certificate.id.toString()}
            </p>
            <h3 className="mt-0.5 font-display text-lg font-semibold text-ink">
              {certificate.course}
            </h3>
          </div>
          {revoked ? (
            <Badge variant="outline" className="!text-invalid">
              <Ban className="h-3.5 w-3.5" /> Revoked
            </Badge>
          ) : (
            <Badge variant="teal">
              <BadgeCheck className="h-3.5 w-3.5" /> Valid
            </Badge>
          )}
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">Holder</dt>
            <dd className="font-mono">{truncate(certificate.student)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">Issued</dt>
            <dd>{formatDate(certificate.issuedAt)}</dd>
          </div>
        </dl>
        <a
          href={snowtraceAddress(certificate.student)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
        >
          View holder on Snowtrace
        </a>
      </div>
    </Card>
  );
}
