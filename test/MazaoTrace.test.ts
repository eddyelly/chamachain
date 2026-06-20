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

  describe("purchase and pickup", function () {
    beforeEach(async function () {
      await mazao.connect(farmer).registerBatch("Cashew", 50n, PRICE());
      await mazao.addTransporter(await transporter.getAddress(), "Bodaboda Express");
    });

    it("funds escrow on purchase and rejects wrong value or the farmer buying", async function () {
      const buyerAddr = await buyer.getAddress();
      await expect(mazao.connect(buyer).purchase(1, { value: PRICE() }))
        .to.emit(mazao, "BatchPurchased")
        .withArgs(1n, buyerAddr, PRICE());

      const b = await mazao.getBatch(1);
      expect(b.buyer).to.equal(buyerAddr);
      expect(b.status).to.equal(1n); // Funded
      expect(await ethers.provider.getBalance(await mazao.getAddress())).to.equal(PRICE());

      await expect(
        mazao.connect(outsider).purchase(1, { value: PRICE() }),
      ).to.be.revertedWith("MazaoTrace: not available");
    });

    it("rejects a purchase with the wrong payment or by the farmer", async function () {
      await mazao.connect(farmer).registerBatch("Cashew", 20n, PRICE());
      await expect(
        mazao.connect(buyer).purchase(2, { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("MazaoTrace: wrong payment");
      await expect(
        mazao.connect(farmer).purchase(2, { value: PRICE() }),
      ).to.be.revertedWith("MazaoTrace: farmer cannot buy");
    });

    it("lets a transporter confirm pickup, only when funded, only transporter", async function () {
      await mazao.connect(buyer).purchase(1, { value: PRICE() });
      const tAddr = await transporter.getAddress();
      await expect(mazao.connect(transporter).confirmPickup(1))
        .to.emit(mazao, "BatchPickedUp")
        .withArgs(1n, tAddr);
      const b = await mazao.getBatch(1);
      expect(b.transporter).to.equal(tAddr);
      expect(b.status).to.equal(2n); // InTransit

      await expect(mazao.connect(buyer).confirmPickup(1)).to.be.revertedWith(
        "MazaoTrace: not a transporter",
      );
    });

    it("rejects pickup of a batch that is not funded", async function () {
      await expect(mazao.connect(transporter).confirmPickup(1)).to.be.revertedWith(
        "MazaoTrace: not funded",
      );
    });
  });

  describe("delivery, cancel, and views", function () {
    beforeEach(async function () {
      await mazao.connect(farmer).registerBatch("Cashew", 50n, PRICE());
      await mazao.addTransporter(await transporter.getAddress(), "Bodaboda Express");
      await mazao.connect(buyer).purchase(1, { value: PRICE() });
    });

    it("releases escrow to the farmer on delivery, only by the buyer", async function () {
      await mazao.connect(transporter).confirmPickup(1);
      await expect(mazao.connect(transporter).confirmDelivery(1)).to.be.revertedWith(
        "MazaoTrace: not the buyer",
      );
      await expect(mazao.connect(buyer).confirmDelivery(1)).to.changeEtherBalance(
        ethers,
        farmer,
        PRICE(),
      );
      const b = await mazao.getBatch(1);
      expect(b.status).to.equal(3n); // Delivered
      expect(await ethers.provider.getBalance(await mazao.getAddress())).to.equal(0n);
    });

    it("rejects delivery before pickup and double delivery", async function () {
      await expect(mazao.connect(buyer).confirmDelivery(1)).to.be.revertedWith(
        "MazaoTrace: not in transit",
      );
      await mazao.connect(transporter).confirmPickup(1);
      await mazao.connect(buyer).confirmDelivery(1);
      await expect(mazao.connect(buyer).confirmDelivery(1)).to.be.revertedWith(
        "MazaoTrace: not in transit",
      );
    });

    it("cancels and refunds the buyer before pickup, by buyer or farmer", async function () {
      await expect(mazao.connect(buyer).cancel(1)).to.changeEtherBalance(ethers, buyer, PRICE());
      expect((await mazao.getBatch(1)).status).to.equal(4n); // Cancelled
    });

    it("rejects cancel after pickup and by a non-party", async function () {
      await expect(mazao.connect(outsider).cancel(1)).to.be.revertedWith("MazaoTrace: not authorized");
      await mazao.connect(transporter).confirmPickup(1);
      await expect(mazao.connect(buyer).cancel(1)).to.be.revertedWith("MazaoTrace: not cancellable");
    });

    it("returns all batches via getBatches", async function () {
      await mazao.connect(farmer).registerBatch("Cashew", 10n, PRICE());
      const list = await mazao.getBatches();
      expect(list.length).to.equal(2);
      expect(list[0].id).to.equal(1n);
      expect(list[1].id).to.equal(2n);
    });
  });

  describe("reentrancy", function () {
    it("blocks a reentrant farmer from double spending on delivery", async function () {
      const attacker = await ethers.deployContract("MazaoReentrant", []);
      await attacker.setMazao(await mazao.getAddress());
      await mazao.addTransporter(await transporter.getAddress(), "Bodaboda Express");

      await attacker.register("Cashew", 50n, PRICE());
      const attackerAddr = await attacker.getAddress();
      await attacker.setTarget(1);

      await mazao.connect(buyer).purchase(1, { value: PRICE() });
      await mazao.connect(transporter).confirmPickup(1);
      await mazao.connect(buyer).confirmDelivery(1);

      expect(await attacker.reentered()).to.equal(true);
      // Exactly one payout left the contract: attacker (farmer) holds price, contract holds 0.
      expect(await ethers.provider.getBalance(attackerAddr)).to.equal(PRICE());
      expect(await ethers.provider.getBalance(await mazao.getAddress())).to.equal(0n);
      expect((await mazao.getBatch(1)).status).to.equal(3n);
    });
  });
});
