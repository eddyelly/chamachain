"use client";

import { useCallback } from "react";
import { useReadContracts } from "wagmi";
import { chamaContract } from "@/lib/chama/contract";
import { IS_CONFIGURED } from "@/lib/chama/config";
import type { Contribution, GroupInfo, Member, Proposal } from "@/lib/chama/types";

const POLL_MS = 6000;

export interface GroupData {
  info: GroupInfo | null;
  members: Member[];
  ledger: Contribution[];
  proposals: Proposal[];
  approversByProposal: Record<string, `0x${string}`[]>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useGroupData(): GroupData {
  const base = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...chamaContract, functionName: "groupInfo" },
      { ...chamaContract, functionName: "getMembers" },
      { ...chamaContract, functionName: "getLedger" },
      { ...chamaContract, functionName: "getProposals" },
    ],
    query: { enabled: IS_CONFIGURED, refetchInterval: POLL_MS },
  });

  const d = base.data;

  const info: GroupInfo | null = d
    ? {
        name: d[0][0],
        threshold: Number(d[0][1]),
        memberCount: Number(d[0][2]),
        pooledBalance: d[0][3],
      }
    : null;

  const members: Member[] = d
    ? d[1][0].map((address, i) => ({ address, label: d[1][1][i], total: d[1][2][i] }))
    : [];

  const ledger: Contribution[] = d
    ? d[2].map((c) => ({
        index: c.index,
        contributor: c.contributor,
        amount: c.amount,
        timestamp: c.timestamp,
      }))
    : [];

  const proposals: Proposal[] = d
    ? d[3].map((p) => ({
        id: p.id,
        proposer: p.proposer,
        recipient: p.recipient,
        amount: p.amount,
        reason: p.reason,
        approvalCount: p.approvalCount,
        executed: p.executed,
        createdAt: p.createdAt,
      }))
    : [];

  const proposalIds = proposals.map((p) => p.id);

  const approverReads = useReadContracts({
    allowFailure: false,
    contracts: proposalIds.map((id) => ({
      ...chamaContract,
      functionName: "getApprovers" as const,
      args: [id] as const,
    })),
    query: { enabled: IS_CONFIGURED && proposalIds.length > 0, refetchInterval: POLL_MS },
  });

  const approversByProposal: Record<string, `0x${string}`[]> = {};
  if (approverReads.data) {
    proposalIds.forEach((id, i) => {
      const entry = approverReads.data[i] as readonly `0x${string}`[];
      approversByProposal[id.toString()] = [...entry];
    });
  }

  const refetch = useCallback(() => {
    void base.refetch();
    void approverReads.refetch();
  }, [base, approverReads]);

  return {
    info,
    members,
    ledger,
    proposals,
    approversByProposal,
    isLoading: base.isLoading,
    isError: base.isError,
    refetch,
  };
}
