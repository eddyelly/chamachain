import { network } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveMembers } from "../lib/members.js";

interface Deployment {
  chainId: number;
  address: string;
}

/// Contribution plan: which member contributes how much AVAX. Kept small so a single
/// faucet drip funds the demo. Members whose accounts are not funded are skipped.
const PLAN: ReadonlyArray<{ index: number; amount: string }> = [
  { index: 0, amount: "0.05" },
  { index: 1, amount: "0.03" },
  { index: 2, amount: "0.04" },
];

function resolveAddress(chainId: bigint): string {
  if (process.env.CHAMA_ADDRESS) {
    return process.env.CHAMA_ADDRESS;
  }
  const file = join(process.cwd(), "deployments", `chama-${chainId}.json`);
  try {
    const record = JSON.parse(readFileSync(file, "utf8")) as Deployment;
    return record.address;
  } catch {
    throw new Error(
      `No CHAMA_ADDRESS set and no deployment file at ${file}. Run the deploy script first.`,
    );
  }
}

async function main(): Promise<void> {
  const mnemonic = process.env.DEMO_MNEMONIC;
  if (!mnemonic) {
    throw new Error("DEMO_MNEMONIC is not set. Copy .env.example to .env and fill it in.");
  }

  const { ethers } = await network.connect();
  const chain = await ethers.provider.getNetwork();
  const address = resolveAddress(chain.chainId);
  const group = await ethers.getContractAt("ChamaGroup", address);
  const members = deriveMembers(ethers, mnemonic);

  console.log(`Seeding ChamaGroup at ${address} on chain ${chain.chainId}`);

  const gasBuffer = ethers.parseEther("0.01");

  for (const item of PLAN) {
    const member = members[item.index];
    const wallet = new ethers.Wallet(member.privateKey, ethers.provider);
    const value = ethers.parseEther(item.amount);
    const balance = await ethers.provider.getBalance(wallet.address);

    if (balance < value + gasBuffer) {
      console.log(
        `Skipping ${member.label}: balance ${ethers.formatEther(balance)} AVAX is too low. ` +
          `Fund ${wallet.address} from https://faucet.avax.network/`,
      );
      continue;
    }

    const tx = await group.connect(wallet).contribute({ value });
    await tx.wait();
    console.log(`${member.label} contributed ${item.amount} AVAX (tx ${tx.hash})`);
  }

  const pool = await group.poolBalance();
  const ledgerLength = await group.ledgerLength();
  console.log(`\nDone. Ledger entries: ${ledgerLength}. Pool balance: ${ethers.formatEther(pool)} AVAX`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
