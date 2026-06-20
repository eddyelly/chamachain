"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

/// Encodes the batch detail URL so a phone camera resolves to this batch. Client-only because
/// it reads window.location.
export function BatchQr({ id, size = 96 }: { id: bigint; size?: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/batch/${id.toString()}`);
  }, [id]);

  if (!url) return <div style={{ width: size, height: size }} className="rounded-lg bg-surface-sunk" />;
  return (
    <div className="rounded-lg bg-surface p-2 shadow-soft">
      <QRCodeSVG value={url} size={size} bgColor="#ffffff" fgColor="#15241a" />
    </div>
  );
}
