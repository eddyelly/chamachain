"use client";

import { useReadContract } from "wagmi";
import { skillPassContract } from "@/lib/skillpass/contract";
import { IS_CONFIGURED } from "@/lib/skillpass/config";
import type { Certificate } from "@/lib/skillpass/types";

export function useCertificatesOf(student?: `0x${string}`) {
  const query = useReadContract({
    ...skillPassContract,
    functionName: "certificatesOf",
    args: student ? [student] : undefined,
    query: { enabled: IS_CONFIGURED && Boolean(student), refetchInterval: 6000 },
  });
  return {
    certificates: (query.data as Certificate[] | undefined) ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useCertificate(id?: bigint) {
  const query = useReadContract({
    ...skillPassContract,
    functionName: "getCertificate",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: IS_CONFIGURED && id !== undefined },
  });
  return {
    certificate: query.data as Certificate | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
