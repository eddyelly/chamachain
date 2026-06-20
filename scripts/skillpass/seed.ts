import { network } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { keccak256, toUtf8Bytes } from "ethers";
import { deriveMembers } from "../lib/members.js";

async function main(): Promise<void> {
  const mnemonic = process.env.DEMO_MNEMONIC;
  if (!mnemonic) throw new Error("DEMO_MNEMONIC is not set.");

  const { ethers } = await network.connect();
  const chain = await ethers.provider.getNetwork();
  const file = join(process.cwd(), "deployments", `skillpass-${chain.chainId}.json`);
  const address =
    process.env.SKILLPASS_ADDRESS ??
    (JSON.parse(readFileSync(file, "utf8")) as { address: string }).address;

  const pass = await ethers.getContractAt("SkillPass", address);
  const members = deriveMembers(ethers, mnemonic);

  const plan = [
    { index: 1, course: "Solidity Bootcamp 2026", fileName: "asha-solidity.pdf" },
    { index: 2, course: "Avalanche Builder Track", fileName: "juma-avalanche.pdf" },
  ];

  for (const item of plan) {
    const student = members[item.index].address;
    const fileHash = keccak256(toUtf8Bytes(`${item.fileName}:${student}`));
    const tx = await pass.issueCertificate(student, item.course, item.fileName, fileHash);
    await tx.wait();
    console.log(`Issued "${item.course}" to ${members[item.index].label} (${student})`);
  }

  console.log(`\nDone. Total certificates: ${await pass.totalCertificates()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
