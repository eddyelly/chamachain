import { expect } from "chai";
import { network } from "hardhat";
import type { ethers as Ethers } from "ethers";

const NAME = "SkillPass TZ";
const SYMBOL = "SKILL";
const ISSUER_NAME = "Sinai Bootcamp";

describe("SkillPass", function () {
  let ethers: typeof Ethers & {
    getSigners: () => Promise<Ethers.Signer[]>;
    deployContract: (name: string, args?: unknown[]) => Promise<Ethers.Contract>;
  };
  let signers: Ethers.Signer[];
  let issuer: Ethers.Signer;
  let student: Ethers.Signer;
  let outsider: Ethers.Signer;
  let pass: Ethers.Contract;

  before(async function () {
    const connection = await network.connect();
    ethers = connection.ethers as typeof ethers;
  });

  beforeEach(async function () {
    signers = await ethers.getSigners();
    issuer = signers[0];
    student = signers[1];
    outsider = signers[2];
    pass = await ethers.deployContract("SkillPass", [NAME, SYMBOL, ISSUER_NAME]);
  });

  describe("issuer registry", function () {
    it("registers the deployer as the first issuer", async function () {
      const issuerAddr = await issuer.getAddress();
      expect(await pass.name()).to.equal(NAME);
      expect(await pass.symbol()).to.equal(SYMBOL);
      expect(await pass.isIssuer(issuerAddr)).to.equal(true);
      expect(await pass.issuerName(issuerAddr)).to.equal(ISSUER_NAME);
    });

    it("lets the owner add another issuer and emits IssuerAdded", async function () {
      const addr = await outsider.getAddress();
      await expect(pass.addIssuer(addr, "UDSM"))
        .to.emit(pass, "IssuerAdded")
        .withArgs(addr, "UDSM");
      expect(await pass.isIssuer(addr)).to.equal(true);
      expect(await pass.issuerName(addr)).to.equal("UDSM");
    });

    it("rejects addIssuer from a non-owner", async function () {
      await expect(
        pass.connect(student).addIssuer(await student.getAddress(), "Fake"),
      ).to.be.revert(ethers);
    });
  });
});
