export interface Member {
  address: `0x${string}`;
  label: string;
  total: bigint;
}

export interface Contribution {
  index: bigint;
  contributor: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
}

export interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  reason: string;
  approvalCount: bigint;
  executed: boolean;
  createdAt: bigint;
}

export interface GroupInfo {
  name: string;
  threshold: number;
  memberCount: number;
  pooledBalance: bigint;
}
