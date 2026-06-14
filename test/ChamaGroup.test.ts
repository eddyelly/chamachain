import { expect } from "chai";
import { network } from "hardhat";
import type { ethers as Ethers } from "ethers";

const NAME = "Kikoba cha Wajasiriamali";
const LABELS = ["Mwenyekiti", "Katibu", "Mweka Hazina", "Mwanachama 1", "Mwanachama 2"];
const THRESHOLD = 3n;

describe("ChamaGroup", function () {
  let ethers: typeof Ethers & {
    getSigners: () => Promise<Ethers.Signer[]>;
    deployContract: (name: string, args?: unknown[]) => Promise<Ethers.Contract>;
    provider: Ethers.Provider;
  };

  let signers: Ethers.Signer[];
  let members: Ethers.Signer[];
  let memberAddrs: string[];
  let outsider: Ethers.Signer;
  let group: Ethers.Contract;

  before(async function () {
    const connection = await network.connect();
    // The mocha-ethers toolbox exposes a fully wired ethers on the connection.
    ethers = connection.ethers as typeof ethers;
  });

  beforeEach(async function () {
    signers = await ethers.getSigners();
    members = signers.slice(0, 5);
    outsider = signers[6];
    memberAddrs = await Promise.all(members.map((m) => m.getAddress()));
    group = await ethers.deployContract("ChamaGroup", [NAME, memberAddrs, LABELS, THRESHOLD]);
  });

  async function fundPool(from: Ethers.Signer, amount: bigint): Promise<void> {
    await (await group.connect(from).contribute({ value: amount })).wait();
  }

  describe("deployment and membership", function () {
    it("stores group identity and threshold", async function () {
      expect(await group.name()).to.equal(NAME);
      expect(await group.threshold()).to.equal(THRESHOLD);
      expect(await group.memberCount()).to.equal(5n);
    });

    it("registers each member with their label", async function () {
      for (let i = 0; i < memberAddrs.length; i++) {
        expect(await group.isMember(memberAddrs[i])).to.equal(true);
        expect(await group.memberLabel(memberAddrs[i])).to.equal(LABELS[i]);
      }
      expect(await group.isMember(await outsider.getAddress())).to.equal(false);
    });

    it("exposes members through getMembers in registration order", async function () {
      const [accounts, labels, totals] = await group.getMembers();
      expect(accounts).to.deep.equal(memberAddrs);
      expect(labels).to.deep.equal(LABELS);
      expect(totals).to.deep.equal(new Array(5).fill(0n));
    });

    it("reverts when members and labels lengths differ", async function () {
      await expect(
        ethers.deployContract("ChamaGroup", [NAME, memberAddrs, LABELS.slice(0, 4), THRESHOLD]),
      ).to.be.revertedWith("ChamaGroup: members/labels length mismatch");
    });

    it("reverts on an invalid threshold", async function () {
      await expect(
        ethers.deployContract("ChamaGroup", [NAME, memberAddrs, LABELS, 0n]),
      ).to.be.revertedWith("ChamaGroup: invalid threshold");
      await expect(
        ethers.deployContract("ChamaGroup", [NAME, memberAddrs, LABELS, 6n]),
      ).to.be.revertedWith("ChamaGroup: invalid threshold");
    });

    it("reverts on a duplicate member", async function () {
      const dupes = [...memberAddrs];
      dupes[4] = dupes[0];
      await expect(
        ethers.deployContract("ChamaGroup", [NAME, dupes, LABELS, THRESHOLD]),
      ).to.be.revertedWith("ChamaGroup: duplicate member");
    });
  });

  describe("contributions ledger", function () {
    it("records a contribution with correct fields and emits an event", async function () {
      const amount = ethers.parseEther("1.5");
      await expect(group.connect(members[0]).contribute({ value: amount }))
        .to.emit(group, "ContributionMade")
        .withArgs(0n, memberAddrs[0], amount, anyUint());

      expect(await group.poolBalance()).to.equal(amount);
      expect(await group.totalContributed(memberAddrs[0])).to.equal(amount);
      expect(await group.ledgerLength()).to.equal(1n);

      const ledger = await group.getLedger();
      expect(ledger.length).to.equal(1);
      expect(ledger[0].index).to.equal(0n);
      expect(ledger[0].contributor).to.equal(memberAddrs[0]);
      expect(ledger[0].amount).to.equal(amount);
    });

    it("appends ledger entries with incrementing indexes in order", async function () {
      await fundPool(members[0], ethers.parseEther("1"));
      await fundPool(members[1], ethers.parseEther("2"));
      await fundPool(members[0], ethers.parseEther("0.5"));

      const ledger = await group.getLedger();
      expect(ledger.map((e: { index: bigint }) => e.index)).to.deep.equal([0n, 1n, 2n]);
      expect(ledger[1].contributor).to.equal(memberAddrs[1]);
      expect(await group.totalContributed(memberAddrs[0])).to.equal(ethers.parseEther("1.5"));
      expect(await group.poolBalance()).to.equal(ethers.parseEther("3.5"));
    });

    it("rejects contributions from non-members", async function () {
      await expect(
        group.connect(outsider).contribute({ value: ethers.parseEther("1") }),
      ).to.be.revertedWith("ChamaGroup: not a member");
    });

    it("rejects a zero-value contribution", async function () {
      await expect(group.connect(members[0]).contribute({ value: 0n })).to.be.revertedWith(
        "ChamaGroup: zero contribution",
      );
    });

    it("rejects plain transfers (no receive function)", async function () {
      await expect(
        members[0].sendTransaction({ to: await group.getAddress(), value: 1n }),
      ).to.be.revert(ethers);
    });
  });

  describe("payout proposals", function () {
    beforeEach(async function () {
      await fundPool(members[0], ethers.parseEther("5"));
    });

    it("lets a member propose and emits PayoutProposed", async function () {
      const amount = ethers.parseEther("2");
      await expect(group.connect(members[0]).proposePayout(memberAddrs[3], amount, "Mkopo wa biashara"))
        .to.emit(group, "PayoutProposed")
        .withArgs(0n, memberAddrs[0], memberAddrs[3], amount, "Mkopo wa biashara");

      expect(await group.proposalCount()).to.equal(1n);
      const p = await group.getProposal(0);
      expect(p.recipient).to.equal(memberAddrs[3]);
      expect(p.amount).to.equal(amount);
      expect(p.executed).to.equal(false);
      expect(p.approvalCount).to.equal(0n);
    });

    it("rejects proposals from non-members", async function () {
      await expect(
        group.connect(outsider).proposePayout(memberAddrs[3], ethers.parseEther("1"), "x"),
      ).to.be.revertedWith("ChamaGroup: not a member");
    });

    it("rejects a proposal exceeding the pool", async function () {
      await expect(
        group.connect(members[0]).proposePayout(memberAddrs[3], ethers.parseEther("6"), "too much"),
      ).to.be.revertedWith("ChamaGroup: amount exceeds pool");
    });

    it("rejects a zero recipient or zero amount", async function () {
      await expect(
        group.connect(members[0]).proposePayout(ethers.ZeroAddress, ethers.parseEther("1"), "x"),
      ).to.be.revertedWith("ChamaGroup: zero recipient");
      await expect(
        group.connect(members[0]).proposePayout(memberAddrs[3], 0n, "x"),
      ).to.be.revertedWith("ChamaGroup: zero amount");
    });
  });

  describe("approvals and threshold release", function () {
    const PAYOUT = () => ethers.parseEther("2");

    beforeEach(async function () {
      await fundPool(members[0], ethers.parseEther("5"));
      await group.connect(members[0]).proposePayout(memberAddrs[3], PAYOUT(), "Mkopo");
    });

    it("records an approval and reports the approver", async function () {
      await expect(group.connect(members[0]).approvePayout(0))
        .to.emit(group, "PayoutApproved")
        .withArgs(0n, memberAddrs[0], 1n);

      expect(await group.hasApproved(0, memberAddrs[0])).to.equal(true);
      expect(await group.getApprovers(0)).to.deep.equal([memberAddrs[0]]);
    });

    it("does NOT release at n-1 approvals", async function () {
      await group.connect(members[0]).approvePayout(0);
      await group.connect(members[1]).approvePayout(0);

      const p = await group.getProposal(0);
      expect(p.approvalCount).to.equal(2n);
      expect(p.executed).to.equal(false);
      expect(await group.poolBalance()).to.equal(ethers.parseEther("5"));
    });

    it("releases exactly at the n-th approval and emits PayoutExecuted", async function () {
      await group.connect(members[0]).approvePayout(0);
      await group.connect(members[1]).approvePayout(0);

      await expect(group.connect(members[2]).approvePayout(0)).to.changeEtherBalance(
        ethers,
        members[3],
        PAYOUT(),
      );

      const p = await group.getProposal(0);
      expect(p.executed).to.equal(true);
      expect(p.approvalCount).to.equal(3n);
      expect(await group.poolBalance()).to.equal(ethers.parseEther("3"));
    });

    it("emits PayoutExecuted with recipient and amount on release", async function () {
      await group.connect(members[0]).approvePayout(0);
      await group.connect(members[1]).approvePayout(0);
      await expect(group.connect(members[2]).approvePayout(0))
        .to.emit(group, "PayoutExecuted")
        .withArgs(0n, memberAddrs[3], PAYOUT());
    });

    it("rejects approvals from non-members", async function () {
      await expect(group.connect(outsider).approvePayout(0)).to.be.revertedWith(
        "ChamaGroup: not a member",
      );
    });

    it("rejects a double approval from the same member", async function () {
      await group.connect(members[0]).approvePayout(0);
      await expect(group.connect(members[0]).approvePayout(0)).to.be.revertedWith(
        "ChamaGroup: already approved",
      );
    });

    it("rejects approving an already executed proposal", async function () {
      await group.connect(members[0]).approvePayout(0);
      await group.connect(members[1]).approvePayout(0);
      await group.connect(members[2]).approvePayout(0);

      await expect(group.connect(members[4]).approvePayout(0)).to.be.revertedWith(
        "ChamaGroup: already executed",
      );
    });
  });

  describe("over-withdrawal protection", function () {
    it("cannot release more than the pooled balance after the pool shrinks", async function () {
      await fundPool(members[0], ethers.parseEther("3"));

      // Two proposals each for the full pool. The first to reach threshold drains it,
      // leaving the second unable to execute against an empty pool.
      await group.connect(members[0]).proposePayout(memberAddrs[3], ethers.parseEther("3"), "first");
      await group.connect(members[0]).proposePayout(memberAddrs[4], ethers.parseEther("3"), "second");

      for (const m of [members[0], members[1], members[2]]) {
        await group.connect(m).approvePayout(0);
      }
      expect(await group.poolBalance()).to.equal(0n);

      await group.connect(members[0]).approvePayout(1);
      await group.connect(members[1]).approvePayout(1);
      await expect(group.connect(members[2]).approvePayout(1)).to.be.revertedWith(
        "ChamaGroup: insufficient pool",
      );
    });
  });

  describe("reentrancy safety", function () {
    it("blocks a reentrant recipient from double spending", async function () {
      const attacker = await ethers.deployContract("MaliciousRecipient", []);
      const attackerAddr = await attacker.getAddress();

      // Rebuild the group with the attacker as a member so it can hold a payout and reenter,
      // then wire the attacker back to this new group.
      const addrs = [...memberAddrs.slice(0, 4), attackerAddr];
      group = await ethers.deployContract("ChamaGroup", [NAME, addrs, LABELS, THRESHOLD]);
      await attacker.setGroup(await group.getAddress());

      await group.connect(members[0]).contribute({ value: ethers.parseEther("4") });

      const payout = ethers.parseEther("2");
      await group.connect(members[0]).proposePayout(attackerAddr, payout, "lure");
      await attacker.setTarget(0);

      await group.connect(members[0]).approvePayout(0);
      await group.connect(members[1]).approvePayout(0);
      // The attacker is the third approver; execution sends funds and triggers its receive().
      await attacker.approve(0);

      expect(await attacker.reentered()).to.equal(true);
      // Exactly one payout left the pool: 4 - 2 = 2, attacker holds 2, no double spend.
      expect(await group.poolBalance()).to.equal(ethers.parseEther("2"));
      expect(await ethers.provider.getBalance(attackerAddr)).to.equal(payout);
      expect((await group.getProposal(0)).executed).to.equal(true);
    });
  });
});

// Matches any uint argument in event assertions (used for block.timestamp).
function anyUint(): unknown {
  return (value: bigint) => typeof value === "bigint" && value >= 0n;
}
