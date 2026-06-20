import { expect } from "chai";
import { network } from "hardhat";
import type { ethers as Ethers } from "ethers";

describe("MazaoTrace", function () {
  let ethers: typeof Ethers & {
    getSigners: () => Promise<Ethers.Signer[]>;
    deployContract: (name: string, args?: unknown[]) => Promise<Ethers.Contract>;
    parseEther: (v: string) => bigint;
    ZeroAddress: string;
    provider: Ethers.Provider;
  };
  let signers: Ethers.Signer[];
  let farmer: Ethers.Signer;
  let transporter: Ethers.Signer;
  let buyer: Ethers.Signer;
  let outsider: Ethers.Signer;
  let mazao: Ethers.Contract;

  const PRICE = () => ethers.parseEther("0.0004");

  before(async function () {
    const connection = await network.connect();
    ethers = connection.ethers as typeof ethers;
  });

  beforeEach(async function () {
    signers = await ethers.getSigners();
    farmer = signers[0];
    transporter = signers[1];
    buyer = signers[2];
    outsider = signers[3];
    mazao = await ethers.deployContract("MazaoTrace", []);
  });

  describe("registry and registration", function () {
    it("registers a batch with the caller as farmer", async function () {
      const farmerAddr = await farmer.getAddress();
      await expect(mazao.connect(farmer).registerBatch("Cashew", 50n, PRICE()))
        .to.emit(mazao, "BatchRegistered")
        .withArgs(1n, farmerAddr, "Cashew", 50n, PRICE());

      const b = await mazao.getBatch(1);
      expect(b.farmer).to.equal(farmerAddr);
      expect(b.crop).to.equal("Cashew");
      expect(b.quantityKg).to.equal(50n);
      expect(b.price).to.equal(PRICE());
      expect(b.status).to.equal(0n); // Registered
      expect(await mazao.batchCount()).to.equal(1n);
    });

    it("rejects empty crop, zero quantity, or zero price", async function () {
      await expect(mazao.registerBatch("", 50n, PRICE())).to.be.revertedWith("MazaoTrace: empty crop");
      await expect(mazao.registerBatch("Cashew", 0n, PRICE())).to.be.revertedWith("MazaoTrace: zero quantity");
      await expect(mazao.registerBatch("Cashew", 50n, 0n)).to.be.revertedWith("MazaoTrace: zero price");
    });

    it("lets the owner add a transporter and rejects non-owners", async function () {
      const tAddr = await transporter.getAddress();
      await expect(mazao.addTransporter(tAddr, "Bodaboda Express"))
        .to.emit(mazao, "TransporterAdded")
        .withArgs(tAddr, "Bodaboda Express");
      expect(await mazao.isTransporter(tAddr)).to.equal(true);
      await expect(
        mazao.connect(buyer).addTransporter(await buyer.getAddress(), "Fake"),
      ).to.be.revert(ethers);
    });

    it("reverts getBatch for an unknown id", async function () {
      await expect(mazao.getBatch(99)).to.be.revertedWith("MazaoTrace: no such batch");
    });
  });
});
