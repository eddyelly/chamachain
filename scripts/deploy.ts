import { network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deriveMembers, GROUP_NAME, MEMBER_LABELS, THRESHOLD } from "./lib/members.js";

async function main(): Promise<void> {
  const mnemonic = process.env.DEMO_MNEMONIC;
  if (!mnemonic) {
    throw new Error("DEMO_MNEMONIC is not set. Copy .env.example to .env and fill it in.");
  }

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  const chain = await ethers.provider.getNetwork();

  const members = deriveMembers(ethers, mnemonic);
  const addresses = members.map((m) => m.address);
  const labels = members.map((m) => m.label);

  if (deployer.address.toLowerCase() !== members[0].address.toLowerCase()) {
    console.warn(
      "Warning: deployer is not member 0 (Mwenyekiti). For the demo, PRIVATE_KEY should match DEMO_MNEMONIC account 0.",
    );
  }

  console.log(`Deploying ChamaGroup to chain ${chain.chainId} as ${deployer.address}`);
  console.log(`Group: "${GROUP_NAME}", threshold ${THRESHOLD} of ${members.length}`);

  const group = await ethers.deployContract(
    "ChamaGroup",
    [GROUP_NAME, addresses, labels, THRESHOLD],
    deployer,
  );
  await group.waitForDeployment();

  const address = await group.getAddress();
  const deployTx = group.deploymentTransaction();

  console.log("\nChamaGroup deployed");
  console.log(`  address: ${address}`);
  console.log(`  tx:      ${deployTx?.hash ?? "unknown"}`);
  console.log("  members:");
  for (const m of members) {
    console.log(`    [${m.index}] ${m.label.padEnd(18)} ${m.address}`);
  }

  const record = {
    chainId: Number(chain.chainId),
    address,
    deployer: deployer.address,
    name: GROUP_NAME,
    threshold: THRESHOLD,
    deployTx: deployTx?.hash ?? null,
    members: members.map((m) => ({ index: m.index, label: m.label, address: m.address })),
  };

  const dir = join(process.cwd(), "deployments");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${chain.chainId}.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`\nWrote ${file}`);
  console.log(`\nNext: set NEXT_PUBLIC_CHAMA_ADDRESS=${address} in web/.env.local`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
