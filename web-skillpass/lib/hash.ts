/// SHA-256 of a file's bytes as a 0x-prefixed 32-byte hex string, computed entirely in the
/// browser. The file never leaves the device; only this hash is stored on-chain.
export async function sha256OfFile(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}
