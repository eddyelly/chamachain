import { skillPassAbi } from "./abi";
import { SKILLPASS_ADDRESS } from "./config";

export const skillPassContract = {
  address: SKILLPASS_ADDRESS,
  abi: skillPassAbi,
} as const;
