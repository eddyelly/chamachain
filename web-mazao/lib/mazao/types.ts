export const STATUS_LABELS = ["Registered", "Funded", "In transit", "Delivered", "Cancelled"] as const;

export type StatusIndex = 0 | 1 | 2 | 3 | 4;

export interface Batch {
  id: bigint;
  farmer: `0x${string}`;
  crop: string;
  quantityKg: bigint;
  price: bigint;
  buyer: `0x${string}`;
  transporter: `0x${string}`;
  status: number;
  registeredAt: bigint;
  fundedAt: bigint;
  pickedUpAt: bigint;
  deliveredAt: bigint;
}
