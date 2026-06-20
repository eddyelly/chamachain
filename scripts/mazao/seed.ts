import { network } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveMembers } from "../lib/members.js";

async function main(): Promise<void> {
  const mnemonic = process.env.DEMO_MNEMONIC;
  if (!mnemonic) throw new Error("DEMO_MNEMONIC is not set.");

  const { ethers } = await network.connect();
  const chain = await ethers.provider.getNetwork();
  const file = join(process.cwd(), "deployments", `mazao-${chain.chainId}.json`);
  const address =
    process.env.MAZAO_ADDRESS ??
    (JSON.parse(readFileSync(file, "utf8")) as { address: string }).address;

  const mazao = await ethers.getContractAt("MazaoTrace", address);
  const members = deriveMembers(ethers, mnemonic);
  const price = ethers.parseEther("0.0004");

  const farmerWallet = new ethers.Wallet(members[0].privateKey, ethers.provider);
  const transporterWallet = new ethers.Wallet(members[1].privateKey, ethers.provider);
  const buyerWallet = new ethers.Wallet(members[2].privateKey, ethers.provider);

  await (await mazao.connect(farmerWallet).addTransporter(members[1].address, "Bodaboda Express")).wait();
  console.log("Added transporter (account 1)");

  await (await mazao.connect(farmerWallet).registerBatch("Cashew", 50n, price)).wait();
  await (await mazao.connect(farmerWallet).registerBatch("Cashew", 30n, price)).wait();
  console.log("Registered 2 cashew batches");

  await (await mazao.connect(buyerWallet).purchase(2, { value: price })).wait();
  await (await mazao.connect(transporterWallet).confirmPickup(2)).wait();
  console.log("Batch 2 purchased and picked up (in transit)");

  console.log(`\nDone. Total batches: ${await mazao.batchCount()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
