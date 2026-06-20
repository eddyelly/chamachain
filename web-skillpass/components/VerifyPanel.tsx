"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useReadContract } from "wagmi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { VerificationSeal } from "./VerificationSeal";
import { OnChainOffChainPanel } from "./OnChainOffChainPanel";
import { FileHashDrop } from "./FileHashDrop";
import { skillPassContract } from "@/lib/skillpass/contract";
import { IS_CONFIGURED } from "@/lib/skillpass/config";
import { truncate } from "@/lib/format";
import type { Certificate } from "@/lib/skillpass/types";

export function VerifyPanel() {
  const [idInput, setIdInput] = useState("");
  const [lookupId, setLookupId] = useState<bigint | null>(null);
  const [droppedHash, setDroppedHash] = useState<`0x${string}` | null>(null);
  const [noFileMatch, setNoFileMatch] = useState(false);

  const certQuery = useReadContract({
    ...skillPassContract,
    functionName: "getCertificate",
    args: lookupId !== null ? [lookupId] : undefined,
    query: { enabled: IS_CONFIGURED && lookupId !== null },
  });

  const hashQuery = useReadContract({
    ...skillPassContract,
    functionName: "verifyByHash",
    args: droppedHash ? [droppedHash] : undefined,
    query: { enabled: IS_CONFIGURED && Boolean(droppedHash) },
  });

  // A dropped file resolves to an id via verifyByHash; id 0 means no certificate matches.
  useEffect(() => {
    if (hashQuery.data === undefined) return;
    const id = hashQuery.data as bigint;
    setLookupId(id > 0n ? id : null);
    setNoFileMatch(id === 0n);
  }, [hashQuery.data]);

  const issuerName = useReadContract({
    ...skillPassContract,
    functionName: "issuerName",
    args: certQuery.data ? [(certQuery.data as Certificate).issuer] : undefined,
    query: { enabled: Boolean(certQuery.data) },
  });

  const cert = certQuery.data as Certificate | undefined;
  const status: "valid" | "revoked" | "unknown" = cert
    ? cert.revoked
      ? "revoked"
      : "valid"
    : "unknown";

  function verifyById() {
    setDroppedHash(null);
    setNoFileMatch(false);
    setLookupId(idInput ? BigInt(idInput) : null);
  }

  function handleHash(hash: `0x${string}` | null) {
    setNoFileMatch(false);
    setDroppedHash(hash);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-ink">Verify by certificate id</p>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder="e.g. 1"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value.replace(/[^0-9]/g, ""))}
          />
          <Button onClick={verifyById} disabled={!idInput}>
            <Search className="h-4 w-4" /> Verify
          </Button>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink">Or match a file</p>
          <FileHashDrop onHash={handleHash} label="Drop a PDF to check its hash" />
          {noFileMatch && (
            <p className="mt-2 text-sm text-invalid">No on-chain credential matches this file.</p>
          )}
        </div>
      </Card>

      {lookupId !== null && (
        <Card className="p-6">
          {certQuery.isError ? (
            <p className="text-center text-sm text-invalid">No certificate with id {lookupId.toString()}.</p>
          ) : cert ? (
            <div className="flex flex-col items-center gap-5">
              <VerificationSeal status={status} />
              <div className="text-center">
                <h3 className="font-display text-xl font-semibold text-ink">{cert.course}</h3>
                <p className="text-sm text-ink-soft">
                  {status === "valid" ? "Genuine credential" : "This credential was revoked"}, issued by{" "}
                  <span className="font-medium text-ink">
                    {(issuerName.data as string | undefined) ?? truncate(cert.issuer)}
                  </span>
                </p>
              </div>
              <div className="w-full">
                <OnChainOffChainPanel certificate={cert} />
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-ink-soft">Looking up...</p>
          )}
        </Card>
      )}
    </div>
  );
}
