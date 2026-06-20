/// Turn a thrown wallet/RPC error into a short, human message (English with light Swahili).
export function getErrorMessage(error: unknown): string {
  const raw =
    typeof error === "object" && error !== null
      ? String(
          (error as { shortMessage?: string; message?: string }).shortMessage ??
            (error as { message?: string }).message ??
            "",
        )
      : String(error ?? "");

  const lower = raw.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("4001")) {
    return "Umeghairi muamala (transaction cancelled)";
  }
  if (lower.includes("insufficient funds")) {
    return "Salio la gesi halitoshi (insufficient gas funds)";
  }
  if (raw.length === 0) return "Hitilafu isiyojulikana (unknown error)";
  return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw;
}
