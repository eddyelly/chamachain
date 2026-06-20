# MazaoTrace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MazaoTrace, a cashew produce traceability system with marketplace escrow, as the third app in the monorepo.

**Architecture:** A standalone `MazaoTrace.sol` (escrow state machine: register, purchase, pickup, deliver, cancel) plus a new `web-mazao/` Next.js app reusing the established layered patterns (lib/hooks/components) with its own distinct leaf-green and cashew-amber identity and a horizontal journey stepper.

**Tech Stack:** Hardhat 3, Solidity 0.8.24, OpenZeppelin v5 (Ownable, ReentrancyGuard), Next.js 16 App Router, wagmi v2, viem, RainbowKit v2, Tailwind v4, framer-motion, sonner, qrcode.react.

## Global Constraints

- Solidity `^0.8.24`, OpenZeppelin v5. The repo's `hardhat.config.ts` already sets `evmVersion: "cancun"` (required for OZ ERC721 elsewhere); do not change it.
- Hardhat 3 ESM. Tests use mocha + ethers via `const { ethers } = await network.connect();`. Chai matchers take `ethers` first: use `.to.be.revert(ethers)` for unspecified reverts, `.to.be.revertedWith("msg")` for reason strings, `.to.changeEtherBalance(ethers, acct, amount)` for balances. NEVER use the deprecated `.to.be.reverted` (it throws in Hardhat 3).
- No em dashes anywhere. Strict TypeScript, no `any`. Frontend layering: `lib/` (config, abi, clients), `hooks/` (all chain reads and writes), `components/` (presentational only).
- Chain: Avalanche Fuji, id 43113, single supported chain.
- Conventional commits, each scoped.
- Batch ids start at 1. Value transfers (`confirmDelivery`, `cancel`) are `nonReentrant` with checks-effects-interactions (status set to a terminal state before the transfer).
- Reuse the five mnemonic-derived wallets: farmer = account 0 (deployer and owner), transporter = account 1 (allowlisted), buyer = account 2. Batch price about 0.0004 AVAX. Root `.env` holds `PRIVATE_KEY` and `DEMO_MNEMONIC`.
- web-mazao tsconfig `target` must be `ES2020`; `next.config.ts` pins `turbopack.root` to the app dir.
- TOKEN LESSON: the mazao `globals.css` MUST define the same token vocabulary the copied UI primitives reference (`cream`, `surface`, `surface-sunk`, `ink`, `ink-soft`, `ink-faint`, `primary`, `primary-deep`, `primary-bright`, `primary-tint`, `gold`, `gold-bright`, `gold-tint`, `clay`, `clay-tint`, `line`, `line-strong`, `success`, `danger`, `radius-card`, `shadow-soft`, `shadow-lift`, `shadow-gold`, `ease-out-soft`), but with the green and amber values. That way the copied primitives render in the mazao identity with no remap and no silent missing-token bug.

---

### Task 1: MazaoTrace scaffold, transporter registry, and registerBatch (TDD)

**Files:**
- Create: `contracts/MazaoTrace.sol`
- Test: `test/MazaoTrace.test.ts`

**Interfaces:**
- Produces: `enum Status { Registered, Funded, InTransit, Delivered, Cancelled }`; `struct Batch { uint256 id; address farmer; string crop; uint256 quantityKg; uint256 price; address buyer; address transporter; Status status; uint64 registeredAt; uint64 fundedAt; uint64 pickedUpAt; uint64 deliveredAt; }`; `constructor()`; `addTransporter(address,string)`; `isTransporter(address) view`; `transporterName(address) view`; `registerBatch(string crop, uint256 quantityKg, uint256 price) returns (uint256 id)`; `getBatch(uint256) view returns (Batch)`; `batchCount() view returns (uint256)`; `nextId() view returns (uint256)`; events `TransporterAdded`, `BatchRegistered`.

- [ ] **Step 1: Write the failing test**

Create `test/MazaoTrace.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/MazaoTrace.test.ts`
Expected: FAIL (cannot deploy MazaoTrace, artifact not found).

- [ ] **Step 3: Write the contract**

Create `contracts/MazaoTrace.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MazaoTrace
/// @notice Cashew produce traceability with marketplace escrow. A batch moves
///         Registered -> Funded -> InTransit -> Delivered, with the buyer's payment held in
///         escrow and released to the farmer only on confirmed delivery. Cancel (before pickup)
///         refunds the buyer.
contract MazaoTrace is Ownable, ReentrancyGuard {
    enum Status {
        Registered,
        Funded,
        InTransit,
        Delivered,
        Cancelled
    }

    struct Batch {
        uint256 id;
        address farmer;
        string crop;
        uint256 quantityKg;
        uint256 price;
        address buyer;
        address transporter;
        Status status;
        uint64 registeredAt;
        uint64 fundedAt;
        uint64 pickedUpAt;
        uint64 deliveredAt;
    }

    mapping(uint256 => Batch) private _batches;
    mapping(address => bool) public isTransporter;
    mapping(address => string) public transporterName;
    uint256 public nextId = 1;

    event TransporterAdded(address indexed transporter, string name);
    event BatchRegistered(
        uint256 indexed id,
        address indexed farmer,
        string crop,
        uint256 quantityKg,
        uint256 price
    );

    modifier onlyTransporter() {
        require(isTransporter[msg.sender], "MazaoTrace: not a transporter");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function addTransporter(address transporter, string calldata name) external onlyOwner {
        require(transporter != address(0), "MazaoTrace: zero transporter");
        isTransporter[transporter] = true;
        transporterName[transporter] = name;
        emit TransporterAdded(transporter, name);
    }

    function registerBatch(string calldata crop, uint256 quantityKg, uint256 price)
        external
        returns (uint256 id)
    {
        require(bytes(crop).length > 0, "MazaoTrace: empty crop");
        require(quantityKg > 0, "MazaoTrace: zero quantity");
        require(price > 0, "MazaoTrace: zero price");

        id = nextId++;
        Batch storage b = _batches[id];
        b.id = id;
        b.farmer = msg.sender;
        b.crop = crop;
        b.quantityKg = quantityKg;
        b.price = price;
        b.status = Status.Registered;
        b.registeredAt = uint64(block.timestamp);

        emit BatchRegistered(id, msg.sender, crop, quantityKg, price);
    }

    function getBatch(uint256 id) external view returns (Batch memory) {
        return _get(id);
    }

    function batchCount() external view returns (uint256) {
        return nextId - 1;
    }

    function _get(uint256 id) private view returns (Batch storage b) {
        b = _batches[id];
        require(b.id != 0, "MazaoTrace: no such batch");
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx hardhat test test/MazaoTrace.test.ts`
Expected: PASS (registry and registration block green).

- [ ] **Step 5: Commit**

```bash
git add contracts/MazaoTrace.sol test/MazaoTrace.test.ts
git commit -m "feat(contracts): MazaoTrace scaffold, transporter registry, registerBatch"
```

---

### Task 2: purchase (escrow) and confirmPickup (TDD)

**Files:**
- Modify: `contracts/MazaoTrace.sol`
- Test: `test/MazaoTrace.test.ts`

**Interfaces:**
- Consumes: Task 1 storage, `onlyTransporter`, `_get`.
- Produces: `purchase(uint256 id) payable`, `confirmPickup(uint256 id)`, events `BatchPurchased(uint256 indexed id, address indexed buyer, uint256 price)`, `BatchPickedUp(uint256 indexed id, address indexed transporter)`. After `purchase`, status is `Funded` (1) and the contract holds `price`. After `confirmPickup`, status is `InTransit` (2).

- [ ] **Step 1: Write the failing tests**

Add inside the top-level describe in `test/MazaoTrace.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx hardhat test test/MazaoTrace.test.ts`
Expected: FAIL (purchase is not a function).

- [ ] **Step 3: Add purchase and confirmPickup**

In `contracts/MazaoTrace.sol`, add these events next to `BatchRegistered`:

```solidity
    event BatchPurchased(uint256 indexed id, address indexed buyer, uint256 price);
    event BatchPickedUp(uint256 indexed id, address indexed transporter);
```

Add these functions after `registerBatch`:

```solidity
    function purchase(uint256 id) external payable {
        Batch storage b = _get(id);
        require(b.status == Status.Registered, "MazaoTrace: not available");
        require(msg.sender != b.farmer, "MazaoTrace: farmer cannot buy");
        require(msg.value == b.price, "MazaoTrace: wrong payment");

        b.buyer = msg.sender;
        b.status = Status.Funded;
        b.fundedAt = uint64(block.timestamp);

        emit BatchPurchased(id, msg.sender, b.price);
    }

    function confirmPickup(uint256 id) external onlyTransporter {
        Batch storage b = _get(id);
        require(b.status == Status.Funded, "MazaoTrace: not funded");

        b.transporter = msg.sender;
        b.status = Status.InTransit;
        b.pickedUpAt = uint64(block.timestamp);

        emit BatchPickedUp(id, msg.sender);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/MazaoTrace.test.ts`
Expected: PASS (registry + purchase/pickup blocks green).

- [ ] **Step 5: Commit**

```bash
git add contracts/MazaoTrace.sol test/MazaoTrace.test.ts
git commit -m "feat(contracts): MazaoTrace purchase escrow and confirmPickup"
```

---

### Task 3: confirmDelivery, cancel, getBatches, and reentrancy (TDD)

**Files:**
- Modify: `contracts/MazaoTrace.sol`
- Create: `contracts/test/MazaoReentrant.sol`
- Test: `test/MazaoTrace.test.ts`

**Interfaces:**
- Consumes: Task 2 state.
- Produces: `confirmDelivery(uint256 id)` (nonReentrant, releases price to farmer, status `Delivered` = 3), `cancel(uint256 id)` (nonReentrant, refunds buyer, status `Cancelled` = 4), `getBatches() view returns (Batch[])`, events `BatchDelivered(uint256 indexed id, address indexed farmer, uint256 price)`, `BatchCancelled(uint256 indexed id, address indexed buyer, uint256 price)`. Helper `MazaoReentrant` test contract.

- [ ] **Step 1: Write the failing tests**

Add inside the top-level describe in `test/MazaoTrace.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx hardhat test test/MazaoTrace.test.ts`
Expected: FAIL (confirmDelivery / MazaoReentrant not found).

- [ ] **Step 3: Add the delivery, cancel, and getBatches code, plus the attacker helper**

In `contracts/MazaoTrace.sol`, add these events:

```solidity
    event BatchDelivered(uint256 indexed id, address indexed farmer, uint256 price);
    event BatchCancelled(uint256 indexed id, address indexed buyer, uint256 price);
```

Add these functions after `confirmPickup`:

```solidity
    function confirmDelivery(uint256 id) external nonReentrant {
        Batch storage b = _get(id);
        require(b.status == Status.InTransit, "MazaoTrace: not in transit");
        require(msg.sender == b.buyer, "MazaoTrace: not the buyer");

        b.status = Status.Delivered;
        b.deliveredAt = uint64(block.timestamp);

        (bool ok, ) = b.farmer.call{value: b.price}("");
        require(ok, "MazaoTrace: payout failed");

        emit BatchDelivered(id, b.farmer, b.price);
    }

    function cancel(uint256 id) external nonReentrant {
        Batch storage b = _get(id);
        require(b.status == Status.Funded, "MazaoTrace: not cancellable");
        require(msg.sender == b.buyer || msg.sender == b.farmer, "MazaoTrace: not authorized");

        b.status = Status.Cancelled;

        (bool ok, ) = b.buyer.call{value: b.price}("");
        require(ok, "MazaoTrace: refund failed");

        emit BatchCancelled(id, b.buyer, b.price);
    }

    function getBatches() external view returns (Batch[] memory list) {
        uint256 count = nextId - 1;
        list = new Batch[](count);
        for (uint256 i = 0; i < count; i++) {
            list[i] = _batches[i + 1];
        }
    }
```

Create `contracts/test/MazaoReentrant.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MazaoTrace} from "../MazaoTrace.sol";

/// @notice Test-only farmer that attempts to reenter on receiving a delivery payout.
contract MazaoReentrant {
    MazaoTrace public mazao;
    uint256 public targetId;
    bool public reentered;

    function setMazao(MazaoTrace _mazao) external {
        mazao = _mazao;
    }

    function setTarget(uint256 id) external {
        targetId = id;
    }

    function register(string calldata crop, uint256 quantityKg, uint256 price)
        external
        returns (uint256)
    {
        return mazao.registerBatch(crop, quantityKg, price);
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            // The reentrancy guard should reject this; swallow the revert so the legitimate
            // payout still completes, then assert in the test that no double spend occurred.
            try mazao.confirmDelivery(targetId) {
                // Reaching here would mean the guard failed.
            } catch {
                // Expected path.
            }
        }
    }
}
```

- [ ] **Step 4: Run the full MazaoTrace suite to verify it passes**

Run: `npx hardhat test test/MazaoTrace.test.ts`
Expected: PASS (all MazaoTrace blocks green).

- [ ] **Step 5: Run the whole repo suite**

Run: `npm test`
Expected: ChamaGroup (24) + SkillPass (13) + MazaoTrace, all passing.

- [ ] **Step 6: Commit**

```bash
git add contracts/MazaoTrace.sol contracts/test/MazaoReentrant.sol test/MazaoTrace.test.ts
git commit -m "feat(contracts): MazaoTrace delivery, cancel, views, and reentrancy guard"
```

---

### Task 4: Deploy and seed scripts

**Files:**
- Create: `scripts/mazao/deploy.ts`, `scripts/mazao/seed.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `deriveMembers` from `scripts/lib/members.ts` (`deriveMembers(ethers, mnemonic)` returns `{ index, label, address, privateKey }[]`).
- Produces: `deployments/mazao-43113.json` with `{ chainId, address, deployer }`.

- [ ] **Step 1: Write the deploy script**

Create `scripts/mazao/deploy.ts`:

```typescript
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
```

- [ ] **Step 2: Write the seed script**

Create `scripts/mazao/seed.ts`. It adds account 1 as the transporter and registers two cashew batches, taking the second through purchase and pickup so the dashboard shows a batch in transit.

```typescript
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
```

- [ ] **Step 3: Add package.json scripts**

In `package.json` `scripts`, add:

```json
    "deploy:mazao": "hardhat run scripts/mazao/deploy.ts --network fuji",
    "seed:mazao": "hardhat run scripts/mazao/seed.ts --network fuji",
```

- [ ] **Step 4: Verify deploy and seed against a local node**

```bash
npx hardhat node > /tmp/mz-node.log 2>&1 &
# poll until http://127.0.0.1:8545 responds to eth_chainId, then:
export DEMO_MNEMONIC="test test test test test test test test test test test junk"
npx hardhat run scripts/mazao/deploy.ts --network localhost
npx hardhat run scripts/mazao/seed.ts --network localhost
```
Expected: deploy prints an address and writes `deployments/mazao-31337.json`; seed adds the transporter, registers 2 batches, purchases + picks up batch 2, prints `Total batches: 2`. Then stop the node (`fuser -k 8545/tcp`) and remove the local file (`rm -f deployments/mazao-31337.json`).

- [ ] **Step 5: Commit**

```bash
git add scripts/mazao/deploy.ts scripts/mazao/seed.ts package.json
git commit -m "feat(scripts): MazaoTrace deploy and seed"
```

---

### Task 5: Scaffold web-mazao and install deps

**Files:**
- Create: `web-mazao/` (create-next-app)
- Modify: `web-mazao/tsconfig.json`, `web-mazao/next.config.ts`

- [ ] **Step 1: Scaffold the app**

```bash
cd /home/edward/projects/chamachain
npx --yes create-next-app@latest web-mazao --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --turbopack --yes
```

- [ ] **Step 2: Install dependencies**

```bash
cd web-mazao
npm install wagmi@^2.16.0 viem @tanstack/react-query @rainbow-me/rainbowkit framer-motion lucide-react sonner class-variance-authority clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-tooltip qrcode.react
```
Expected: installs without a wagmi/RainbowKit peer error (wagmi pinned to v2). Note `qrcode.react` (the QR component) and `@radix-ui/react-tooltip` are included up front (the latter was a late add in SkillPass).

- [ ] **Step 3: Fix tsconfig target and turbopack root**

In `web-mazao/tsconfig.json` set `"target": "ES2020"`.

Replace `web-mazao/next.config.ts` with:

```typescript
import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
```

- [ ] **Step 4: Commit**

```bash
cd /home/edward/projects/chamachain
git add web-mazao
git commit -m "chore(web-mazao): scaffold Next.js app and dependencies"
```

---

### Task 6: Reuse infrastructure and generate the ABI

**Files:**
- Create (copy from web-chama, then edit imports/labels): `web-mazao/lib/utils.ts`, `web-mazao/lib/errors.ts`, `web-mazao/hooks/useNetwork.ts`, `web-mazao/hooks/useTxRunner.ts`, `web-mazao/components/ui/{button,card,input,badge,skeleton,dialog,tooltip}.tsx`, `web-mazao/components/ConnectWallet.tsx`, `web-mazao/app/providers.tsx`, `web-mazao/lib/wagmi.ts`
- Create: `web-mazao/lib/mazao/abi.ts`

**Interfaces:**
- Consumes: the compiled `artifacts/contracts/MazaoTrace.sol/MazaoTrace.json`.
- Produces: `useNetwork()`, `useTxRunner()` (returns `{ runWith, write, isBusy }`), `cn()`, the UI primitives, and `mazaoTraceAbi` exported `as const`.

- [ ] **Step 1: Copy the reusable files**

```bash
cd /home/edward/projects/chamachain
mkdir -p web-mazao/lib/mazao web-mazao/hooks web-mazao/components/ui
cp web-chama/lib/utils.ts web-mazao/lib/utils.ts
cp web-chama/lib/errors.ts web-mazao/lib/errors.ts
cp web-chama/hooks/useNetwork.ts web-mazao/hooks/useNetwork.ts
cp web-chama/hooks/useTxRunner.ts web-mazao/hooks/useTxRunner.ts
cp web-chama/components/ui/button.tsx web-mazao/components/ui/button.tsx
cp web-chama/components/ui/card.tsx web-mazao/components/ui/card.tsx
cp web-chama/components/ui/input.tsx web-mazao/components/ui/input.tsx
cp web-chama/components/ui/badge.tsx web-mazao/components/ui/badge.tsx
cp web-chama/components/ui/skeleton.tsx web-mazao/components/ui/skeleton.tsx
cp web-chama/components/ui/dialog.tsx web-mazao/components/ui/dialog.tsx
cp web-chama/components/ui/tooltip.tsx web-mazao/components/ui/tooltip.tsx
cp web-chama/components/ConnectWallet.tsx web-mazao/components/ConnectWallet.tsx
cp web-chama/app/providers.tsx web-mazao/app/providers.tsx
cp web-chama/lib/wagmi.ts web-mazao/lib/wagmi.ts
```

Then fix the chama-specific imports and labels (the SkillPass tokens stay valid because Task 7 defines the same token vocabulary in the mazao palette, so the primitives need no class changes):

- In `web-mazao/hooks/useNetwork.ts` and `web-mazao/hooks/useTxRunner.ts`, change the import path `@/lib/chama/config` to `@/lib/mazao/config` (Task 8 defines it).
- In `web-mazao/app/providers.tsx`, change the RainbowKit `lightTheme` `accentColor` from `"#0e3b36"` to `"#1f7a3d"` and `accentColorForeground` to `"#f4faf2"`.
- In `web-mazao/components/ConnectWallet.tsx`, change the label "Unganisha pochi" to "Connect wallet".

- [ ] **Step 2: Generate the ABI**

```bash
cd /home/edward/projects/chamachain
npx hardhat compile
node -e '
const fs = require("fs");
const abi = require("./artifacts/contracts/MazaoTrace.sol/MazaoTrace.json").abi;
const header = "// Generated from artifacts/contracts/MazaoTrace.sol/MazaoTrace.json\n\n";
fs.writeFileSync("web-mazao/lib/mazao/abi.ts", header + "export const mazaoTraceAbi = " + JSON.stringify(abi, null, 2) + " as const;\n");
console.log("wrote web-mazao/lib/mazao/abi.ts");
'
```

- [ ] **Step 3: Commit**

```bash
git add web-mazao/lib web-mazao/hooks web-mazao/components web-mazao/app/providers.tsx
git commit -m "chore(web-mazao): reuse chama infra and generate ABI"
```

---

### Task 7: MazaoTrace design tokens and fonts (distinct identity)

**Files:**
- Modify: `web-mazao/app/globals.css`, `web-mazao/app/layout.tsx`

**Interfaces:**
- Produces: the green/amber token vocabulary (using the SAME token names the copied primitives reference, so they need no edits) and fonts wired to `--font-bricolage`, `--font-dmsans`, `--font-spline`.

- [ ] **Step 1: Replace globals.css with the green/amber tokens**

Replace `web-mazao/app/globals.css` with:

```css
@import "tailwindcss";

/* MazaoTrace tokens: field-to-market logistics. Vivid leaf green + cashew amber on a bright
   off-white base. Uses the same token names the shared UI primitives expect (cream, gold,
   success, etc.), so the copied primitives render in this identity with no edits. */
@theme {
  --color-cream: #f5faf3;
  --color-cream-deep: #e7f1e3;
  --color-surface: #ffffff;
  --color-surface-sunk: #eef5ea;

  --color-ink: #15241a;
  --color-ink-soft: #4f6657;
  --color-ink-faint: #88a08f;

  --color-primary: #1f7a3d;
  --color-primary-deep: #155e2e;
  --color-primary-bright: #2c9d54;
  --color-primary-tint: #d8ecdd;

  --color-gold: #bf6a1a;
  --color-gold-bright: #e89432;
  --color-gold-tint: #f7e6cf;

  --color-clay: #b4521f;
  --color-clay-tint: #efd9cb;

  --color-line: #e2ebdd;
  --color-line-strong: #cddcc6;

  --color-success: #1f9d57;
  --color-danger: #c0392b;

  --font-display: var(--font-bricolage), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--font-dmsans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-spline), ui-monospace, "SF Mono", monospace;

  --radius-card: 1.25rem;

  --shadow-soft: 0 1px 2px rgba(21, 36, 26, 0.04), 0 10px 30px -12px rgba(21, 36, 26, 0.14);
  --shadow-lift: 0 2px 6px rgba(21, 36, 26, 0.07), 0 24px 60px -20px rgba(21, 94, 46, 0.26);
  --shadow-gold: 0 10px 40px -12px rgba(232, 148, 50, 0.5);

  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
}

@layer base {
  body {
    background-color: var(--color-cream);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  ::selection {
    background-color: var(--color-primary-tint);
    color: var(--color-primary-deep);
  }
  :focus-visible {
    outline: 2px solid var(--color-primary-bright);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

@layer utilities {
  .font-display {
    font-family: var(--font-display);
    letter-spacing: -0.02em;
  }
  .tnum {
    font-variant-numeric: tabular-nums lining-nums;
  }
  .text-balance {
    text-wrap: balance;
  }
  /* The dashed route line between journey steps. */
  .route-line {
    background-image: repeating-linear-gradient(
      90deg,
      var(--color-line-strong) 0 8px,
      transparent 8px 14px
    );
  }
}

@keyframes shimmer {
  100% { transform: translateX(100%); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes popIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

- [ ] **Step 2: Replace layout.tsx with the distinct fonts**

Replace `web-mazao/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, Spline_Sans_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap" });
const spline = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MazaoTrace | Cashew traceability with escrow",
  description:
    "Track a cashew batch from farm to market on-chain, with the buyer's payment held in escrow until delivery is confirmed.",
};

export const viewport: Viewport = {
  themeColor: "#1f7a3d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${spline.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/edward/projects/chamachain
git add web-mazao/app/globals.css web-mazao/app/layout.tsx
git commit -m "feat(web-mazao): leaf-green and cashew-amber design tokens and fonts"
```

---

### Task 8: MazaoTrace lib and hooks

**Files:**
- Create: `web-mazao/lib/mazao/config.ts`, `web-mazao/lib/mazao/contract.ts`, `web-mazao/lib/mazao/types.ts`, `web-mazao/lib/mazao/demo.ts`, `web-mazao/lib/format.ts`
- Create: `web-mazao/hooks/useBatches.ts`, `web-mazao/hooks/useBatchActions.ts`

**Interfaces:**
- Consumes: `mazaoTraceAbi` (Task 6), `useTxRunner` (Task 6).
- Produces: `MAZAO_ADDRESS`, `IS_CONFIGURED`, `FUJI`, `snowtraceAddress`, `snowtraceTx`; `mazaoContract`; `Batch` type + `Status` enum-equivalent; demo signer helpers; `useBatches()`, `useBatch(id)`; and `useBatchActions(onConfirmed)` exposing `register`, `purchase`, `pickup`, `deliver`, `cancel` (each as a demo-signer call using the correct role).

- [ ] **Step 1: Create config, contract, and types**

`web-mazao/lib/mazao/config.ts`:

```typescript
import { avalancheFuji } from "wagmi/chains";

export const FUJI = avalancheFuji;
export const FUJI_CHAIN_ID = avalancheFuji.id;

const rawAddress = process.env.NEXT_PUBLIC_MAZAO_ADDRESS ?? "";
export const MAZAO_ADDRESS = rawAddress as `0x${string}`;
export const IS_CONFIGURED = /^0x[0-9a-fA-F]{40}$/.test(rawAddress);

export const SNOWTRACE_BASE = "https://testnet.snowtrace.io";
export const snowtraceTx = (h: string) => `${SNOWTRACE_BASE}/tx/${h}`;
export const snowtraceAddress = (a: string) => `${SNOWTRACE_BASE}/address/${a}`;
```

`web-mazao/lib/mazao/contract.ts`:

```typescript
import { mazaoTraceAbi } from "./abi";
import { MAZAO_ADDRESS } from "./config";

export const mazaoContract = {
  address: MAZAO_ADDRESS,
  abi: mazaoTraceAbi,
} as const;
```

`web-mazao/lib/mazao/types.ts`:

```typescript
export const STATUS_LABELS = ["Registered", "Funded", "In transit", "Delivered", "Cancelled"] as const;

export type StatusIndex = 0 | 1 | 2 | 3 | 4;

export interface Batch {
  id: bigint;
  farmer: `0x${string}`;
  crop: string;
  quantityKg: bigint;
  price: bigint;
  buyer: `0x${string}`;
  transporter: `0x${string}`;
  status: number;
  registeredAt: bigint;
  fundedAt: bigint;
  pickedUpAt: bigint;
  deliveredAt: bigint;
}
```

- [ ] **Step 2: Create format helpers**

`web-mazao/lib/format.ts`:

```typescript
import { formatEther } from "viem";

export function formatAvax(wei: bigint, maxFractionDigits = 5): string {
  const [whole, fraction = ""] = formatEther(wei).split(".");
  if (fraction.length === 0) return whole;
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole;
}

export function truncate(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

export function relativeTime(unixSeconds: bigint | number, nowMs = Date.now()): string {
  const then = Number(unixSeconds) * 1000;
  if (then === 0) return "";
  const sec = Math.floor(Math.max(0, nowMs - then) / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
```

- [ ] **Step 3: Create the demo signer (act as farmer / transporter / buyer)**

`web-mazao/lib/mazao/demo.ts`:

```typescript
import { createWalletClient, http, type WalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { FUJI } from "./config";

const MNEMONIC = process.env.NEXT_PUBLIC_DEMO_MNEMONIC ?? "";
export const DEMO_ENABLED = MNEMONIC.trim().split(/\s+/).length >= 12;
const RPC_URL = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? FUJI.rpcUrls.default.http[0];

export const ROLE = { farmer: 0, transporter: 1, buyer: 2 } as const;
export type Role = keyof typeof ROLE;

export function demoAddress(role: Role): `0x${string}` {
  if (!DEMO_ENABLED) return "0x0000000000000000000000000000000000000000";
  return mnemonicToAccount(MNEMONIC, { addressIndex: ROLE[role] }).address;
}

/// A viem wallet client signing as the given demo role. Testnet only.
export function demoClient(role: Role): WalletClient | null {
  if (!DEMO_ENABLED) return null;
  const account = mnemonicToAccount(MNEMONIC, { addressIndex: ROLE[role] });
  return createWalletClient({ account, chain: FUJI, transport: http(RPC_URL) });
}
```

- [ ] **Step 4: Create the read hook**

`web-mazao/hooks/useBatches.ts`:

```typescript
"use client";

import { useReadContract } from "wagmi";
import { mazaoContract } from "@/lib/mazao/contract";
import { IS_CONFIGURED } from "@/lib/mazao/config";
import type { Batch } from "@/lib/mazao/types";

export function useBatches() {
  const query = useReadContract({
    ...mazaoContract,
    functionName: "getBatches",
    query: { enabled: IS_CONFIGURED, refetchInterval: 5000 },
  });
  return {
    batches: (query.data as Batch[] | undefined) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useBatch(id?: bigint) {
  const query = useReadContract({
    ...mazaoContract,
    functionName: "getBatch",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: IS_CONFIGURED && id !== undefined, refetchInterval: 5000 },
  });
  return {
    batch: query.data as Batch | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
```

- [ ] **Step 5: Create the action hook**

`web-mazao/hooks/useBatchActions.ts`:

```typescript
"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import { mazaoContract } from "@/lib/mazao/contract";
import { mazaoTraceAbi } from "@/lib/mazao/abi";
import { FUJI } from "@/lib/mazao/config";
import { demoClient, type Role } from "@/lib/mazao/demo";
import { useTxRunner, type TxCopy } from "./useTxRunner";

type DemoClient = NonNullable<ReturnType<typeof demoClient>>;

export function useBatchActions(onConfirmed?: () => void) {
  const { runWith, isBusy } = useTxRunner();

  // Each action calls writeContract with a literal functionName so viem can infer arg types
  // (a union-typed functionName breaks inference). runAs only resolves the demo client + lifecycle.
  const runAs = useCallback(
    (role: Role, copy: TxCopy, makeTx: (client: DemoClient) => Promise<`0x${string}`>) => {
      const client = demoClient(role);
      if (!client || !client.account) return Promise.resolve(false);
      return runWith(() => makeTx(client), copy, onConfirmed);
    },
    [runWith, onConfirmed],
  );

  const register = useCallback(
    (crop: string, quantityKg: bigint, priceEther: string) =>
      runAs(
        "farmer",
        { submitting: "Farmer is registering...", pending: "Waiting for confirmation...", success: "Batch registered" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "registerBatch",
            args: [crop, quantityKg, parseEther(priceEther)],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const purchase = useCallback(
    (id: bigint, price: bigint) =>
      runAs(
        "buyer",
        { submitting: "Buyer is purchasing...", pending: "Locking escrow...", success: "Escrow funded" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "purchase",
            args: [id],
            value: price,
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const pickup = useCallback(
    (id: bigint) =>
      runAs(
        "transporter",
        { submitting: "Transporter is confirming pickup...", pending: "Waiting for confirmation...", success: "Picked up, in transit" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "confirmPickup",
            args: [id],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const deliver = useCallback(
    (id: bigint) =>
      runAs(
        "buyer",
        { submitting: "Buyer is confirming delivery...", pending: "Releasing escrow...", success: "Delivered, farmer paid" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "confirmDelivery",
            args: [id],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  const cancel = useCallback(
    (id: bigint) =>
      runAs(
        "buyer",
        { submitting: "Cancelling...", pending: "Refunding buyer...", success: "Cancelled, buyer refunded" },
        (client) =>
          client.writeContract({
            address: mazaoContract.address,
            abi: mazaoTraceAbi,
            functionName: "cancel",
            args: [id],
            account: client.account!,
            chain: FUJI,
          }),
      ),
    [runAs],
  );

  return { register, purchase, pickup, deliver, cancel, isBusy };
}
```

- [ ] **Step 6: Commit**

```bash
cd /home/edward/projects/chamachain
git add web-mazao/lib web-mazao/hooks
git commit -m "feat(web-mazao): config, demo signer, batch reads and actions"
```

---

### Task 9: MazaoTrace components and pages

**Files:**
- Create: `web-mazao/components/SiteHeader.tsx`, `web-mazao/components/BatchStepper.tsx`, `web-mazao/components/BatchCard.tsx`, `web-mazao/components/BatchQr.tsx`, `web-mazao/components/RegisterDialog.tsx`, `web-mazao/components/BatchActions.tsx`, `web-mazao/components/DeliveredCelebration.tsx`, `web-mazao/components/SetupNotice.tsx`
- Create: `web-mazao/app/page.tsx`, `web-mazao/app/batch/[id]/page.tsx`

**Interfaces:**
- Consumes: hooks and lib from Task 8, UI primitives from Task 6.
- Produces: the dashboard and the batch detail page.

- [ ] **Step 1: Create the site header and setup notice**

`web-mazao/components/SiteHeader.tsx`:

```tsx
import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 4C10 9 9 15 16 28C23 15 22 9 16 4Z" fill="var(--color-primary)" />
      <circle cx="16" cy="13" r="2.6" fill="var(--color-gold-bright)" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-ink">MazaoTrace</p>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint sm:block">
              Cashew, farm to market
            </p>
          </div>
        </Link>
        <ConnectWallet />
      </div>
    </header>
  );
}
```

`web-mazao/components/SetupNotice.tsx`:

```tsx
import { Terminal } from "lucide-react";
import { Card } from "./ui/card";

export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="p-7">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-tint text-primary">
            <Terminal className="h-5 w-5" />
          </span>
          <h1 className="font-display text-xl font-semibold text-ink">Welcome to MazaoTrace</h1>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          No contract is configured yet. Run <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">npm run deploy:mazao</code>, then set
          <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_MAZAO_ADDRESS</code> in
          <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">web-mazao/.env.local</code> and restart.
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create the journey stepper**

`web-mazao/components/BatchStepper.tsx`:

```tsx
import { Check, Sprout, Wallet, Truck, PackageCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Registered", icon: Sprout },
  { label: "Funded", icon: Wallet },
  { label: "In transit", icon: Truck },
  { label: "Delivered", icon: PackageCheck },
] as const;

/// Horizontal journey: filled up to the current status. Cancelled (status 4) is shown as a
/// stopped journey at the Funded step.
export function BatchStepper({ status, compact = false }: { status: number; compact?: boolean }) {
  const cancelled = status === 4;
  const reached = cancelled ? 1 : status; // index of the last completed step

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= reached && !(cancelled && i > 1);
        const Icon = cancelled && i === 1 ? XCircle : step.icon;
        return (
          <div key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid place-items-center rounded-full border-2 transition-colors",
                  compact ? "h-7 w-7" : "h-10 w-10",
                  cancelled && i === 1
                    ? "border-danger bg-danger text-cream"
                    : done
                      ? "border-primary bg-primary text-cream"
                      : "border-line-strong bg-surface text-ink-faint",
                )}
              >
                {done && !(cancelled && i === 1) ? (
                  <Check className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} strokeWidth={2.5} />
                ) : (
                  <Icon className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} />
                )}
              </span>
              {!compact && (
                <span className={cn("text-xs font-medium", done ? "text-ink" : "text-ink-faint")}>
                  {step.label}
                </span>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-1.5 h-0.5 flex-1 sm:mx-2">
                <div className={cn("h-full", i < reached && !cancelled ? "bg-primary" : "route-line")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create the QR and batch card**

`web-mazao/components/BatchQr.tsx`:

```tsx
"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

/// Encodes the batch detail URL so a phone camera resolves to this batch. Client-only because
/// it reads window.location.
export function BatchQr({ id, size = 96 }: { id: bigint; size?: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/batch/${id.toString()}`);
  }, [id]);

  if (!url) return <div style={{ width: size, height: size }} className="rounded-lg bg-surface-sunk" />;
  return (
    <div className="rounded-lg bg-surface p-2 shadow-soft">
      <QRCodeSVG value={url} size={size} bgColor="#ffffff" fgColor="#15241a" />
    </div>
  );
}
```

`web-mazao/components/BatchCard.tsx`:

```tsx
import Link from "next/link";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { BatchStepper } from "./BatchStepper";
import { formatAvax } from "@/lib/format";
import { STATUS_LABELS, type Batch } from "@/lib/mazao/types";

function statusVariant(status: number): "teal" | "gold" | "success" | "outline" {
  if (status === 3) return "success";
  if (status === 2) return "gold";
  if (status === 4) return "outline";
  return "teal";
}

export function BatchCard({ batch }: { batch: Batch }) {
  return (
    <Link href={`/batch/${batch.id.toString()}`} className="block">
      <Card className="p-5 transition-shadow hover:shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Batch #{batch.id.toString()}
            </p>
            <h3 className="font-display text-lg font-semibold text-ink">
              {batch.crop} · {batch.quantityKg.toString()} kg
            </h3>
          </div>
          <Badge variant={statusVariant(batch.status)}>{STATUS_LABELS[batch.status]}</Badge>
        </div>
        <p className="mt-1 font-mono text-sm font-semibold text-gold tnum">
          {formatAvax(batch.price)} AVAX
        </p>
        <div className="mt-5">
          <BatchStepper status={batch.status} compact />
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Create the register dialog and the action panel**

`web-mazao/components/RegisterDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useBatchActions } from "@/hooks/useBatchActions";
import { DEMO_ENABLED } from "@/lib/mazao/demo";

export function RegisterDialog({ onConfirmed }: { onConfirmed: () => void }) {
  const [open, setOpen] = useState(false);
  const [crop, setCrop] = useState("Cashew");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("0.0004");
  const { register, isBusy } = useBatchActions(onConfirmed);

  const valid = crop.trim().length > 0 && Number(qty) > 0 && Number(price) > 0;

  async function submit() {
    if (!valid) return;
    const ok = await register(crop.trim(), BigInt(Math.floor(Number(qty))), price);
    if (ok) {
      setOpen(false);
      setQty("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="md" disabled={!DEMO_ENABLED}>
          <Plus className="h-4 w-4" />
          Register batch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a cashew batch</DialogTitle>
          <DialogDescription>The farmer registers a batch for sale. A QR is generated for traceability.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Crop</label>
            <Input value={crop} onChange={(e) => setCrop(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Quantity (kg)</label>
            <Input inputMode="numeric" placeholder="50" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))} className="font-mono tnum" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Price (AVAX)</label>
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} className="font-mono tnum" />
          </div>
          <Button onClick={submit} disabled={!valid || isBusy} size="lg" className="mt-1 w-full">
            {isBusy ? "Registering..." : "Register batch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

`web-mazao/components/BatchActions.tsx`:

```tsx
"use client";

import { Button } from "./ui/button";
import { useBatchActions } from "@/hooks/useBatchActions";
import { DEMO_ENABLED } from "@/lib/mazao/demo";
import type { Batch } from "@/lib/mazao/types";

/// Demo-driven action panel: shows the action(s) valid for the batch's current status, each
/// performed by the correct role via the demo signer.
export function BatchActions({ batch, onConfirmed }: { batch: Batch; onConfirmed: () => void }) {
  const { purchase, pickup, deliver, cancel, isBusy } = useBatchActions(onConfirmed);

  if (!DEMO_ENABLED) {
    return <p className="text-sm text-ink-soft">Demo signing is off. Set NEXT_PUBLIC_DEMO_MNEMONIC to drive the flow.</p>;
  }

  if (batch.status === 0) {
    return (
      <Button variant="gold" size="lg" className="w-full" disabled={isBusy} onClick={() => void purchase(batch.id, batch.price)}>
        Buyer: purchase and fund escrow
      </Button>
    );
  }
  if (batch.status === 1) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" className="w-full" disabled={isBusy} onClick={() => void pickup(batch.id)}>
          Transporter: confirm pickup
        </Button>
        <Button variant="ghost" size="md" className="w-full" disabled={isBusy} onClick={() => void cancel(batch.id)}>
          Cancel and refund the buyer
        </Button>
      </div>
    );
  }
  if (batch.status === 2) {
    return (
      <Button variant="gold" size="lg" className="w-full" disabled={isBusy} onClick={() => void deliver(batch.id)}>
        Buyer: confirm delivery and release payment
      </Button>
    );
  }
  return null;
}
```

- [ ] **Step 5: Create the delivered celebration**

`web-mazao/components/DeliveredCelebration.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PackageCheck } from "lucide-react";
import { Button } from "./ui/button";
import { formatAvax } from "@/lib/format";

export function DeliveredCelebration({
  open,
  amount,
  onClose,
}: {
  open: boolean;
  amount: bigint;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-primary-deep/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center shadow-lift"
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-cream shadow-[var(--shadow-gold)]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <PackageCheck className="h-8 w-8" strokeWidth={2.2} />
            </motion.div>
            <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Delivered and paid</h2>
            <p className="mt-1 text-sm text-ink-soft">Escrow released to the farmer</p>
            <p className="mt-4 font-mono text-2xl font-semibold text-gold tnum">{formatAvax(amount)} AVAX</p>
            <Button variant="primary" size="md" className="mt-6 w-full" onClick={onClose}>
              Done
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 6: Create the dashboard page**

`web-mazao/app/page.tsx`:

```tsx
"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { BatchCard } from "@/components/BatchCard";
import { RegisterDialog } from "@/components/RegisterDialog";
import { SetupNotice } from "@/components/SetupNotice";
import { useBatches } from "@/hooks/useBatches";
import { IS_CONFIGURED } from "@/lib/mazao/config";

export default function Home() {
  const { batches, isLoading, refetch } = useBatches();

  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }

  const ordered = [...batches].sort((a, b) => Number(b.id - a.id));

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Farm to market, on-chain
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Cashew batches
            </h1>
          </div>
          <RegisterDialog onConfirmed={refetch} />
        </div>

        {isLoading && batches.length === 0 ? (
          <p className="text-sm text-ink-soft">Loading batches...</p>
        ) : ordered.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
            <p className="font-display text-base font-medium text-ink">No batches yet</p>
            <p className="mt-1 text-sm text-ink-soft">Register the first cashew batch to start the journey.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((b) => (
              <BatchCard key={b.id.toString()} batch={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Create the batch detail page**

`web-mazao/app/batch/[id]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BatchStepper } from "@/components/BatchStepper";
import { BatchQr } from "@/components/BatchQr";
import { BatchActions } from "@/components/BatchActions";
import { DeliveredCelebration } from "@/components/DeliveredCelebration";
import { SetupNotice } from "@/components/SetupNotice";
import { Card } from "@/components/ui/card";
import { useBatch } from "@/hooks/useBatches";
import { IS_CONFIGURED, snowtraceAddress } from "@/lib/mazao/config";
import { formatAvax, truncate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/mazao/types";

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const batchId = BigInt(id);
  const { batch, isLoading, isError, refetch } = useBatch(batchId);

  const [celebrate, setCelebrate] = useState(false);
  const wasInTransit = useRef(false);

  // Celebrate the transition into Delivered (status 3) that this page observes.
  useEffect(() => {
    if (!batch) return;
    if (batch.status === 2) wasInTransit.current = true;
    if (batch.status === 3 && wasInTransit.current) {
      wasInTransit.current = false;
      setCelebrate(true);
    }
  }, [batch]);

  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> All batches
        </Link>

        {isError || (!isLoading && !batch) ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-danger">No batch #{id} found.</p>
          </Card>
        ) : !batch ? (
          <p className="text-sm text-ink-soft">Loading batch...</p>
        ) : (
          <div className="flex flex-col gap-5">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Batch #{batch.id.toString()} · {STATUS_LABELS[batch.status]}
                  </p>
                  <h1 className="font-display text-2xl font-semibold text-ink">
                    {batch.crop} · {batch.quantityKg.toString()} kg
                  </h1>
                  <p className="mt-1 font-mono text-lg font-semibold text-gold tnum">
                    {formatAvax(batch.price)} AVAX
                  </p>
                </div>
                <BatchQr id={batch.id} />
              </div>

              <div className="mt-7">
                <BatchStepper status={batch.status} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Parties</h2>
              <dl className="space-y-2 text-sm">
                <Party label="Farmer" value={batch.farmer} />
                <Party label="Buyer" value={batch.buyer} />
                <Party label="Transporter" value={batch.transporter} />
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Action</h2>
              <BatchActions batch={batch} onConfirmed={refetch} />
            </Card>
          </div>
        )}
      </main>

      <DeliveredCelebration
        open={celebrate}
        amount={batch?.price ?? 0n}
        onClose={() => setCelebrate(false)}
      />
    </div>
  );
}

function Party({ label, value }: { label: string; value: `0x${string}` }) {
  const empty = /^0x0{40}$/.test(value);
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-soft">{label}</dt>
      {empty ? (
        <dd className="text-ink-faint">not assigned</dd>
      ) : (
        <dd>
          <a
            href={snowtraceAddress(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-ink transition-colors hover:text-primary"
          >
            {truncate(value)}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </dd>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Build the app to verify it compiles**

Run: `cd web-mazao && npm run build && cd ..`
Expected: `Compiled successfully`, routes `/` and `/batch/[id]` listed. If the build fails, fix the errors (missing imports, type errors) and rebuild until green.

- [ ] **Step 9: Commit**

```bash
git add web-mazao
git commit -m "feat(web-mazao): dashboard, batch journey, and escrow actions"
```

---

### Task 10: web-mazao .env.example and README

**Files:**
- Create: `web-mazao/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create web-mazao/.env.example**

```
NEXT_PUBLIC_MAZAO_ADDRESS=0xyour_deployed_mazaotrace_address
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_DEMO_MNEMONIC="your throwaway twelve word testnet mnemonic here"
NEXT_PUBLIC_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

- [ ] **Step 2: Update the root README**

Read the existing README. In the "## Projects" section, change the MazaoTrace bullet from "(planned)" to "(frontend in `web-mazao/`)" and describe it as a cashew produce traceability system with marketplace escrow. Add a "## MazaoTrace" section with: the deploy/seed commands (`npm run deploy:mazao`, then set `NEXT_PUBLIC_MAZAO_ADDRESS` in `web-mazao/.env.local`, then `npm run seed:mazao`), the run command (`cd web-mazao && npm run dev`), the three roles (farmer = account 0, transporter = account 1 added at seed, buyer = account 2), the escrow flow (purchase locks escrow, delivery releases to the farmer, cancel before pickup refunds the buyer), and a one-line note that each step is an on-chain event with a per-batch QR. No em dashes. Keep all existing content intact.

- [ ] **Step 3: Commit**

```bash
git add web-mazao/.env.example README.md
git commit -m "docs: MazaoTrace setup and run steps"
```

---

## Self-Review notes

- Spec coverage: state machine (Tasks 1 to 3), escrow release on delivery + cancel refund (Task 3), reentrancy (Task 3), transporter allowlist (Task 1), deploy/seed with role wallets (Task 4), distinct green/amber UI + horizontal stepper + QR (Tasks 7 and 9), demo-signer roles (Task 8), batch dashboard + detail (Task 9). README (Task 10). Live Fuji deploy is held for the user (Task 10 documents the commands but does not run them).
- Token lesson applied: Task 7 defines the chama token vocabulary in mazao colors, so the Task 6 copied primitives need no class edits and there is no silent missing-token bug.
- The copied UI primitives/providers/wagmi/useNetwork/useTxRunner/errors/utils are intentional verbatim reuse (consistent with web-chama and web-skillpass), an accepted monorepo decision.
- `.to.be.revert(ethers)` is used for the non-owner addTransporter check (Task 1); all other negative tests use `.to.be.revertedWith(...)` with reason strings.
