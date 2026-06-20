import { formatEther } from "viem";

export function formatAvax(wei: bigint, maxFractionDigits = 5): string {
  const [whole, fraction = ""] = formatEther(wei).split(".");
  if (fraction.length === 0) return whole;
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole;
}

export function truncate(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

export function relativeTime(unixSeconds: bigint | number, nowMs = Date.now()): string {
  const then = Number(unixSeconds) * 1000;
  if (then === 0) return "";
  const sec = Math.floor(Math.max(0, nowMs - then) / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
