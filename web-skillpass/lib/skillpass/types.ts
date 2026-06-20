export interface Certificate {
  id: bigint;
  student: `0x${string}`;
  issuer: `0x${string}`;
  course: string;
  fileName: string;
  fileHash: `0x${string}`;
  issuedAt: bigint;
  revoked: boolean;
}
