"use client";

import { useCallback } from "react";
import { skillPassContract } from "@/lib/skillpass/contract";
import { skillPassAbi } from "@/lib/skillpass/abi";
import { FUJI } from "@/lib/skillpass/config";
import { demoIssuerClient } from "@/lib/skillpass/demo";
import { useTxRunner } from "./useTxRunner";

export function useIssueCertificate(onConfirmed?: () => void) {
  const { runWith, write, isBusy } = useTxRunner();

  const issueConnected = useCallback(
    (student: `0x${string}`, course: string, fileName: string, fileHash: `0x${string}`) =>
      runWith(
        () =>
          write({
            ...skillPassContract,
            functionName: "issueCertificate",
            args: [student, course, fileName, fileHash],
          }),
        {
          submitting: "Issuing credential...",
          pending: "Waiting for confirmation...",
          success: "Credential issued",
        },
        onConfirmed,
      ),
    [runWith, write, onConfirmed],
  );

  const issueAsInstitution = useCallback(
    (student: `0x${string}`, course: string, fileName: string, fileHash: `0x${string}`) => {
      const client = demoIssuerClient();
      if (!client || !client.account) return Promise.resolve(false);
      const account = client.account;
      return runWith(
        () =>
          client.writeContract({
            address: skillPassContract.address,
            abi: skillPassAbi,
            functionName: "issueCertificate",
            args: [student, course, fileName, fileHash],
            account,
            chain: FUJI,
          }),
        {
          submitting: "Institution is issuing...",
          pending: "Waiting for confirmation...",
          success: "Credential issued",
        },
        onConfirmed,
      );
    },
    [runWith, onConfirmed],
  );

  return { issueConnected, issueAsInstitution, isBusy };
}
