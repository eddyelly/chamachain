"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import { mazaoContract } from "@/lib/mazao/contract";
import { mazaoTraceAbi } from "@/lib/mazao/abi";
import { FUJI } from "@/lib/mazao/config";
import { demoClient, type Role } from "@/lib/mazao/demo";
import { useTxRunner, type TxCopy } from "./useTxRunner";

type DemoClient = NonNullable<ReturnType<typeof demoClient>>;

export function useBatchActions(onConfirmed?: () => void) {
  const { runWith, isBusy } = useTxRunner();

  // Each action calls writeContract with a literal functionName so viem can infer arg types
  // (a union-typed functionName breaks inference). runAs only resolves the demo client + lifecycle.
  const runAs = useCallback(
    (role: Role, copy: TxCopy, makeTx: (client: DemoClient) => Promise<`0x${string}`>) => {
      const client = demoClient(role);
      if (!client || !client.account) return Promise.resolve(false);
      return runWith(() => makeTx(client), copy, onConfirmed);
    },
    [runWith, onConfirmed],
  );

  const register = useCallback(
    (crop: string, quantityKg: bigint, priceEther: string) =>
      runAs(
        "farmer",
        { submitting: "Farmer is registering...", pending: "Waiting for confirmation...", success: "Batch registered" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "registerBatch",
            args: [crop, quantityKg, parseEther(priceEther)],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const purchase = useCallback(
    (id: bigint, price: bigint) =>
      runAs(
        "buyer",
        { submitting: "Buyer is purchasing...", pending: "Locking escrow...", success: "Escrow funded" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "purchase",
            args: [id],
            value: price,
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const pickup = useCallback(
    (id: bigint) =>
      runAs(
        "transporter",
        { submitting: "Transporter is confirming pickup...", pending: "Waiting for confirmation...", success: "Picked up, in transit" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "confirmPickup",
            args: [id],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const deliver = useCallback(
    (id: bigint) =>
      runAs(
        "buyer",
        { submitting: "Buyer is confirming delivery...", pending: "Releasing escrow...", success: "Delivered, farmer paid" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "confirmDelivery",
            args: [id],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const cancel = useCallback(
    (id: bigint) =>
      runAs(
        "buyer",
        { submitting: "Cancelling...", pending: "Refunding buyer...", success: "Cancelled, buyer refunded" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "cancel",
            args: [id],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  return { register, purchase, pickup, deliver, cancel, isBusy };
}
