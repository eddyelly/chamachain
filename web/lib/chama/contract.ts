import { chamaGroupAbi } from "./abi";
import { CHAMA_ADDRESS } from "./config";

/// Reusable wagmi contract descriptor. Hooks spread this into read/write calls so the
/// address and ABI live in exactly one place.
export const chamaContract = {
  address: CHAMA_ADDRESS,
  abi: chamaGroupAbi,
} as const;
