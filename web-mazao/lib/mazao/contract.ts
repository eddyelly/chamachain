import { mazaoTraceAbi } from "./abi";
import { MAZAO_ADDRESS } from "./config";

export const mazaoContract = {
  address: MAZAO_ADDRESS,
  abi: mazaoTraceAbi,
} as const;
