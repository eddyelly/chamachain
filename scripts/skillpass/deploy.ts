import { network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const NAME = "SkillPass TZ";
const SYMBOL = "SKILL";
const ISSUER_NAME = "Sinai Bootcamp";

async function main(): Promise<void> {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  const chain = await ethers.provider.getNetwork();

  console.log(`Deploying SkillPass to chain ${chain.chainId} as ${deployer.address}`);
  const pass = await ethers.deployContract("SkillPass", [NAME, SYMBOL, ISSUER_NAME], deployer);
  await pass.waitForDeployment();

  const address = await pass.getAddress();
  console.log(`\nSkillPass deployed`);
  console.log(`  address: ${address}`);
  console.log(`  issuer:  ${ISSUER_NAME} (${deployer.address})`);

  const dir = join(process.cwd(), "deployments");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `skillpass-${chain.chainId}.json`);
  writeFileSync(
    file,
    `${JSON.stringify({ chainId: Number(chain.chainId), address, issuerName: ISSUER_NAME, deployer: deployer.address }, null, 2)}\n`,
  );
  console.log(`\nWrote ${file}`);
  console.log(`\nNext: set NEXT_PUBLIC_SKILLPASS_ADDRESS=${address} in web-skillpass/.env.local`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
