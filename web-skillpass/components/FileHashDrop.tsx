"use client";

import { useState } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { sha256OfFile } from "@/lib/hash";
import { truncate } from "@/lib/format";

export function FileHashDrop({
  onHash,
  label = "Drop the certificate PDF",
}: {
  onHash: (hash: `0x${string}` | null, fileName: string) => void;
  label?: string;
}) {
  const [name, setName] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    const h = await sha256OfFile(file);
    setName(file.name);
    setHash(h);
    onHash(h, file.name);
  }

  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-sunk px-4 py-6 text-center transition-colors hover:border-primary-bright">
      <input
        type="file"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      {hash ? (
        <>
          <FileCheck2 className="h-6 w-6 text-valid" />
          <p className="text-sm font-medium text-ink">{name}</p>
          <p className="font-mono text-xs text-ink-soft">{truncate(hash, 10, 8)}</p>
        </>
      ) : (
        <>
          <UploadCloud className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-xs text-ink-soft">Hashed in your browser, the file is not uploaded</p>
        </>
      )}
    </label>
  );
}
