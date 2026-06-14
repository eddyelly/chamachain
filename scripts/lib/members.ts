import type { ethers as Ethers } from "ethers";

/// Shared demo group configuration used by both deploy and seed so they never drift apart.

export const GROUP_NAME = "Kikoba cha Wajasiriamali";
export const THRESHOLD = 3;

/// Five members: three officer roles plus two named members. Labels are stored on-chain
/// and rendered verbatim by the frontend.
export const MEMBER_LABELS = [
  "Mwenyekiti",
  "Katibu",
  "Mweka Hazina",
  "Mwanachama Asha",
  "Mwanachama Juma",
] as const;

export interface DemoMember {
  index: number;
  label: string;
  address: string;
  privateKey: string;
}

/// Derive the five member accounts deterministically from a BIP-39 mnemonic.
/// Index 0 is the chair (Mwenyekiti) and must match PRIVATE_KEY (the deployer / presenter).
export function deriveMembers(ethers: typeof Ethers, mnemonic: string): DemoMember[] {
  return MEMBER_LABELS.map((label, index) => {
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", `m/44'/60'/0'/0/${index}`);
    return {
      index,
      label,
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  });
}
