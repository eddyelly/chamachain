import { network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main(): Promise<void> {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  const chain = await ethers.provider.getNetwork();

  console.log(`Deploying MazaoTrace to chain ${chain.chainId} as ${deployer.address}`);
  const mazao = await ethers.deployContract("MazaoTrace", [], deployer);
  await mazao.waitForDeployment();

  const address = await mazao.getAddress();
  console.log(`\nMazaoTrace deployed`);
  console.log(`  address: ${address}`);
  console.log(`  owner/farmer: ${deployer.address}`);

  const dir = join(process.cwd(), "deployments");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `mazao-${chain.chainId}.json`);
  writeFileSync(
    file,
    `${JSON.stringify({ chainId: Number(chain.chainId), address, deployer: deployer.address }, null, 2)}\n`,
  );
  console.log(`\nWrote ${file}`);
  console.log(`\nNext: set NEXT_PUBLIC_MAZAO_ADDRESS=${address} in web-mazao/.env.local`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
