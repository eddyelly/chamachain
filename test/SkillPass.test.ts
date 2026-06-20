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

  describe("issuing certificates", function () {
    const HASH_A = "0x" + "11".repeat(32);
    const HASH_B = "0x" + "22".repeat(32);

    it("mints a soulbound token and stores the certificate", async function () {
      const studentAddr = await student.getAddress();
      const issuerAddr = await issuer.getAddress();
      await expect(pass.issueCertificate(studentAddr, "Solidity Bootcamp", "cert.pdf", HASH_A))
        .to.emit(pass, "CertificateIssued")
        .withArgs(1n, studentAddr, issuerAddr, "Solidity Bootcamp", HASH_A);

      expect(await pass.ownerOf(1)).to.equal(studentAddr);
      const c = await pass.getCertificate(1);
      expect(c.student).to.equal(studentAddr);
      expect(c.issuer).to.equal(issuerAddr);
      expect(c.course).to.equal("Solidity Bootcamp");
      expect(c.fileHash).to.equal(HASH_A);
      expect(c.revoked).to.equal(false);
      expect(await pass.tokenIdByHash(HASH_A)).to.equal(1n);
    });

    it("blocks transfers (soulbound)", async function () {
      const studentAddr = await student.getAddress();
      await pass.issueCertificate(studentAddr, "Course", "f.pdf", HASH_A);
      await expect(
        pass.connect(student).transferFrom(studentAddr, await outsider.getAddress(), 1),
      ).to.be.revertedWith("SkillPass: soulbound, non-transferable");
    });

    it("rejects issuing from a non-issuer", async function () {
      await expect(
        pass.connect(student).issueCertificate(await student.getAddress(), "C", "f.pdf", HASH_A),
      ).to.be.revertedWith("SkillPass: not an issuer");
    });

    it("rejects a duplicate file hash", async function () {
      const studentAddr = await student.getAddress();
      await pass.issueCertificate(studentAddr, "C1", "a.pdf", HASH_A);
      await expect(
        pass.issueCertificate(studentAddr, "C2", "b.pdf", HASH_A),
      ).to.be.revertedWith("SkillPass: file already certified");
    });

    it("rejects a zero student or zero hash", async function () {
      await expect(
        pass.issueCertificate(ethers.ZeroAddress, "C", "f.pdf", HASH_A),
      ).to.be.revertedWith("SkillPass: zero student");
      await expect(
        pass.issueCertificate(await student.getAddress(), "C", "f.pdf", ethers.ZeroHash),
      ).to.be.revertedWith("SkillPass: zero hash");
    });

    it("assigns incrementing ids", async function () {
      const s1 = await student.getAddress();
      await pass.issueCertificate(s1, "C1", "a.pdf", HASH_A);
      await pass.issueCertificate(s1, "C2", "b.pdf", HASH_B);
      expect((await pass.getCertificate(2)).id).to.equal(2n);
      expect(await pass.nextId()).to.equal(3n);
    });
  });
});
