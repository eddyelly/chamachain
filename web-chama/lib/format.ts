import { formatEther } from "viem";

/// Format a wei amount as a trimmed AVAX string. Keeps up to `maxFractionDigits`
/// significant fractional digits without trailing zeros.
export function formatAvax(wei: bigint, maxFractionDigits = 4): string {
  const full = formatEther(wei);
  const [whole, fraction = ""] = full.split(".");
  if (fraction.length === 0) return whole;
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole;
}

export function truncateAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/// Compact relative time from a unix-seconds timestamp (for example "2h ago", "just now").
export function relativeTime(unixSeconds: number | bigint, nowMs = Date.now()): string {
  const then = Number(unixSeconds) * 1000;
  const diff = Math.max(0, nowMs - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  return `${Math.floor(month / 12)}y ago`;
}

export function absoluteTime(unixSeconds: number | bigint): string {
  const date = new Date(Number(unixSeconds) * 1000);
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/// Initials from a member label, for example "Mweka Hazina" -> "MH".
export function initials(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  { bg: "#0E3B36", fg: "#E9C46A" },
  { bg: "#1E5F57", fg: "#F4E3C1" },
  { bg: "#A4561E", fg: "#FBEBD6" },
  { bg: "#8A3B2E", fg: "#F6E0D6" },
  { bg: "#3E5C3A", fg: "#EAF0D9" },
] as const;

/// Deterministic warm avatar colors derived from an address, so a member looks the same
/// everywhere without storing extra data.
export function avatarColors(address: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 2; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
