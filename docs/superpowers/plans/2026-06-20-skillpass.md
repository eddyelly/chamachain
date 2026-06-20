# SkillPass TZ + Monorepo Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the repo into a 3-project monorepo and build SkillPass TZ, a soulbound certificate system with issuer, student, and verifier roles.

**Architecture:** One Hardhat workspace compiles all contracts. ChamaChain moves to `web-chama/` untouched. SkillPass adds `contracts/SkillPass.sol` (soulbound ERC-721), `scripts/skillpass/`, and a new `web-skillpass/` Next.js app reusing ChamaChain's layered patterns (lib/hooks/components) with its own distinct indigo "passport" design tokens.

**Tech Stack:** Hardhat 3, Solidity 0.8.24, OpenZeppelin v5 (ERC721, Ownable, Base64), Next.js 16 App Router, wagmi v2, viem, RainbowKit v2, Tailwind v4, framer-motion, sonner.

## Global Constraints

- Solidity `^0.8.24`, OpenZeppelin Contracts v5 (`@openzeppelin/contracts` already installed at repo root).
- Hardhat 3 ESM. Tests use mocha + ethers via `@nomicfoundation/hardhat-toolbox-mocha-ethers`. Get ethers with `const { ethers } = await network.connect();`. Chai matchers take `ethers` as the first arg: `.to.changeEtherBalance(ethers, acct, amount)`, and `.to.be.revert(ethers)` for unspecified reverts (use `.to.be.revertedWith("msg")` for reason strings).
- No em dashes anywhere (code, comments, copy, docs). Use commas, colons, or parentheses.
- Strict TypeScript, no `any`. Frontend layering: `lib/` (config, abi, clients), `hooks/` (all chain reads and writes), `components/` (presentational only).
- Chain: Avalanche Fuji, id 43113, single supported chain per frontend.
- Conventional commits, each scoped.
- Web tsconfig `target` must be `ES2020` (bigint literals). `next.config.ts` pins `turbopack.root` to the app dir.
- Token ids start at 1. Every certificate file hash is unique on-chain. Certificates are soulbound (non-transferable); revocation is a flag, tokens are never burned.
- Reuse the five mnemonic-derived wallets: issuer = index 0, students = indexes 1 and 2 (funded on Fuji). Root `.env` already holds `PRIVATE_KEY` and `DEMO_MNEMONIC`.

---

### Task 0: Monorepo restructure (keep ChamaChain green)

**Files:**
- Move: `web/` to `web-chama/`
- Move: `scripts/deploy.ts` to `scripts/chama/deploy.ts`, `scripts/seed.ts` to `scripts/chama/seed.ts`
- Modify: `scripts/chama/deploy.ts`, `scripts/chama/seed.ts` (import path + deployment filename)
- Modify: `package.json` (script names)

- [ ] **Step 1: Move the chama frontend and scripts**

```bash
cd /home/edward/projects/chamachain
mv web web-chama
mkdir -p scripts/chama
git mv scripts/deploy.ts scripts/chama/deploy.ts
git mv scripts/seed.ts scripts/chama/seed.ts
git add -A
```

- [ ] **Step 2: Fix import paths and deployment filename in the moved scripts**

In `scripts/chama/deploy.ts`: the import `from "./lib/members.js"` becomes `from "../lib/members.js"`. Change the deployment file write from `` `${chain.chainId}.json` `` to `` `chama-${chain.chainId}.json` ``.

In `scripts/chama/seed.ts`: change `from "./lib/members.js"` to `from "../lib/members.js"`, and the deployment file read from `` `${chainId}.json` `` to `` `chama-${chainId}.json` ``.

- [ ] **Step 3: Rename the package.json scripts**

In `package.json`, replace the `scripts` block deploy/seed entries with:

```json
    "deploy:chama": "hardhat run scripts/chama/deploy.ts --network fuji",
    "seed:chama": "hardhat run scripts/chama/seed.ts --network fuji",
```

- [ ] **Step 4: Verify ChamaChain still compiles and tests pass**

Run: `npm test`
Expected: `24 passing`

- [ ] **Step 5: Verify the chama frontend still builds**

Run: `cd web-chama && npm run build && cd ..`
Expected: `Compiled successfully`, route `/` prerendered.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: restructure into monorepo (web -> web-chama, scripts/chama)"
```

---

### Task 1: SkillPass contract scaffold and issuer registry (TDD)

**Files:**
- Create: `contracts/SkillPass.sol`
- Test: `test/SkillPass.test.ts`

**Interfaces:**
- Produces: `SkillPass` contract with constructor `(string name_, string symbol_, string firstIssuerName)`, `isIssuer(address) view returns (bool)`, `issuerName(address) view returns (string)`, `addIssuer(address issuer, string name)`, event `IssuerAdded(address indexed issuer, string name)`.

- [ ] **Step 1: Write the failing test**

Create `test/SkillPass.test.ts`:

```typescript
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
      ).to.be.reverted;
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx hardhat test test/SkillPass.test.ts`
Expected: FAIL (artifact for SkillPass not found / cannot deploy).

- [ ] **Step 3: Write the minimal contract**

Create `contracts/SkillPass.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SkillPass
/// @notice Soulbound credential NFTs. Institutions (issuers) mint non-transferable
///         certificates to a student's wallet. The wallet becomes a public skill passport.
contract SkillPass is ERC721, Ownable {
    mapping(address => bool) public isIssuer;
    mapping(address => string) public issuerName;

    event IssuerAdded(address indexed issuer, string name);

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "SkillPass: not an issuer");
        _;
    }

    constructor(string memory name_, string memory symbol_, string memory firstIssuerName)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {
        isIssuer[msg.sender] = true;
        issuerName[msg.sender] = firstIssuerName;
        emit IssuerAdded(msg.sender, firstIssuerName);
    }

    function addIssuer(address issuer, string calldata name) external onlyOwner {
        require(issuer != address(0), "SkillPass: zero issuer");
        isIssuer[issuer] = true;
        issuerName[issuer] = name;
        emit IssuerAdded(issuer, name);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx hardhat test test/SkillPass.test.ts`
Expected: PASS (3 passing in the issuer registry block).

- [ ] **Step 5: Commit**

```bash
git add contracts/SkillPass.sol test/SkillPass.test.ts
git commit -m "feat(contracts): SkillPass scaffold with issuer registry"
```

---

### Task 2: issueCertificate and soulbound mint (TDD)

**Files:**
- Modify: `contracts/SkillPass.sol`
- Test: `test/SkillPass.test.ts`

**Interfaces:**
- Consumes: `onlyIssuer`, `isIssuer` from Task 1.
- Produces: `struct Certificate { uint256 id; address student; address issuer; string course; string fileName; bytes32 fileHash; uint64 issuedAt; bool revoked; }`, `issueCertificate(address student, string course, string fileName, bytes32 fileHash) returns (uint256 id)`, `getCertificate(uint256 id) view returns (Certificate)`, `tokenIdByHash(bytes32) view returns (uint256)`, `nextId() view returns (uint256)`, event `CertificateIssued(uint256 indexed id, address indexed student, address indexed issuer, string course, bytes32 fileHash)`. Soulbound: any transfer reverts with `"SkillPass: soulbound, non-transferable"`.

- [ ] **Step 1: Write the failing tests**

Add this `describe` block inside `test/SkillPass.test.ts` (before the closing of the top-level describe):

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx hardhat test test/SkillPass.test.ts`
Expected: FAIL (issueCertificate is not a function).

- [ ] **Step 3: Add the certificate storage, issue function, and soulbound override**

In `contracts/SkillPass.sol`, add after the `issuerName` mapping:

```solidity
    struct Certificate {
        uint256 id;
        address student;
        address issuer;
        string course;
        string fileName;
        bytes32 fileHash;
        uint64 issuedAt;
        bool revoked;
    }

    mapping(uint256 => Certificate) private _certificates;
    mapping(address => uint256[]) private _studentTokens;
    mapping(bytes32 => uint256) public tokenIdByHash;
    uint256 public nextId = 1;
```

Add this event next to `IssuerAdded`:

```solidity
    event CertificateIssued(
        uint256 indexed id,
        address indexed student,
        address indexed issuer,
        string course,
        bytes32 fileHash
    );
```

Add these functions after `addIssuer`:

```solidity
    function issueCertificate(
        address student,
        string calldata course,
        string calldata fileName,
        bytes32 fileHash
    ) external onlyIssuer returns (uint256 id) {
        require(student != address(0), "SkillPass: zero student");
        require(fileHash != bytes32(0), "SkillPass: zero hash");
        require(tokenIdByHash[fileHash] == 0, "SkillPass: file already certified");

        id = nextId++;
        _certificates[id] = Certificate({
            id: id,
            student: student,
            issuer: msg.sender,
            course: course,
            fileName: fileName,
            fileHash: fileHash,
            issuedAt: uint64(block.timestamp),
            revoked: false
        });
        _studentTokens[student].push(id);
        tokenIdByHash[fileHash] = id;

        _safeMint(student, id);
        emit CertificateIssued(id, student, msg.sender, course, fileHash);
    }

    function getCertificate(uint256 id) external view returns (Certificate memory) {
        require(_certificates[id].id != 0, "SkillPass: no such certificate");
        return _certificates[id];
    }

    /// @dev Soulbound: minting (from == zero) is allowed, every transfer reverts.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = super._update(to, tokenId, auth);
        require(from == address(0), "SkillPass: soulbound, non-transferable");
        return from;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx hardhat test test/SkillPass.test.ts`
Expected: PASS (issuer registry + issuing blocks all green).

- [ ] **Step 5: Commit**

```bash
git add contracts/SkillPass.sol test/SkillPass.test.ts
git commit -m "feat(contracts): SkillPass soulbound certificate issuance"
```

---

### Task 3: Revoke, views, and tokenURI (TDD)

**Files:**
- Modify: `contracts/SkillPass.sol`
- Test: `test/SkillPass.test.ts`

**Interfaces:**
- Consumes: certificate storage from Task 2.
- Produces: `revoke(uint256 id)`, `certificatesOf(address) view returns (Certificate[])`, `isValid(uint256 id) view returns (bool)`, `verifyByHash(bytes32) view returns (uint256)`, `totalCertificates() view returns (uint256)`, `tokenURI(uint256) view returns (string)`, event `CertificateRevoked(uint256 indexed id)`.

- [ ] **Step 1: Write the failing tests**

Add inside the top-level describe in `test/SkillPass.test.ts`:

```typescript
  describe("revocation and views", function () {
    const HASH_A = "0x" + "33".repeat(32);
    const HASH_B = "0x" + "44".repeat(32);

    it("revokes and flips isValid, only by issuer or owner", async function () {
      const s1 = await student.getAddress();
      await pass.issueCertificate(s1, "C1", "a.pdf", HASH_A);
      expect(await pass.isValid(1)).to.equal(true);

      await expect(pass.connect(outsider).revoke(1)).to.be.revertedWith(
        "SkillPass: not authorized",
      );
      await expect(pass.revoke(1)).to.emit(pass, "CertificateRevoked").withArgs(1n);
      expect(await pass.isValid(1)).to.equal(false);
    });

    it("returns all certificates of a student", async function () {
      const s1 = await student.getAddress();
      await pass.issueCertificate(s1, "C1", "a.pdf", HASH_A);
      await pass.issueCertificate(s1, "C2", "b.pdf", HASH_B);
      const list = await pass.certificatesOf(s1);
      expect(list.length).to.equal(2);
      expect(list[0].course).to.equal("C1");
      expect(list[1].course).to.equal("C2");
    });

    it("verifies by file hash and counts totals", async function () {
      const s1 = await student.getAddress();
      await pass.issueCertificate(s1, "C1", "a.pdf", HASH_A);
      expect(await pass.verifyByHash(HASH_A)).to.equal(1n);
      expect(await pass.verifyByHash(HASH_B)).to.equal(0n);
      expect(await pass.totalCertificates()).to.equal(1n);
    });

    it("exposes a tokenURI data URI", async function () {
      const s1 = await student.getAddress();
      await pass.issueCertificate(s1, "Solidity", "a.pdf", HASH_A);
      const uri = await pass.tokenURI(1);
      expect(uri.startsWith("data:application/json;base64,")).to.equal(true);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx hardhat test test/SkillPass.test.ts`
Expected: FAIL (revoke is not a function).

- [ ] **Step 3: Add revoke, views, and tokenURI**

Add the import at the top of `contracts/SkillPass.sol` (after the Ownable import):

```solidity
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
```

Add the event next to the others:

```solidity
    event CertificateRevoked(uint256 indexed id);
```

Add these functions after `getCertificate`:

```solidity
    function revoke(uint256 id) external {
        Certificate storage c = _certificates[id];
        require(c.id != 0, "SkillPass: no such certificate");
        require(msg.sender == c.issuer || msg.sender == owner(), "SkillPass: not authorized");
        require(!c.revoked, "SkillPass: already revoked");
        c.revoked = true;
        emit CertificateRevoked(id);
    }

    function certificatesOf(address student) external view returns (Certificate[] memory list) {
        uint256[] storage ids = _studentTokens[student];
        list = new Certificate[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = _certificates[ids[i]];
        }
    }

    function isValid(uint256 id) external view returns (bool) {
        Certificate storage c = _certificates[id];
        return c.id != 0 && !c.revoked;
    }

    function verifyByHash(bytes32 fileHash) external view returns (uint256) {
        return tokenIdByHash[fileHash];
    }

    function totalCertificates() external view returns (uint256) {
        return nextId - 1;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        Certificate memory c = _certificates[id];
        require(c.id != 0, "SkillPass: no such certificate");
        string memory status = c.revoked ? "Revoked" : "Valid";
        string memory json = string(
            abi.encodePacked(
                '{"name":"',
                c.course,
                '","description":"SkillPass credential issued by ',
                issuerName[c.issuer],
                '","attributes":[{"trait_type":"Issuer","value":"',
                issuerName[c.issuer],
                '"},{"trait_type":"Status","value":"',
                status,
                '"}]}'
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }
```

- [ ] **Step 4: Run the full SkillPass suite to verify it passes**

Run: `npx hardhat test test/SkillPass.test.ts`
Expected: PASS (all blocks green).

- [ ] **Step 5: Run the whole repo test suite (chama still green)**

Run: `npm test`
Expected: chama 24 passing plus the SkillPass tests, all passing.

- [ ] **Step 6: Commit**

```bash
git add contracts/SkillPass.sol test/SkillPass.test.ts
git commit -m "feat(contracts): SkillPass revoke, views, and tokenURI"
```

---

### Task 4: Deploy and seed scripts for SkillPass

**Files:**
- Create: `scripts/skillpass/deploy.ts`
- Create: `scripts/skillpass/seed.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `deriveMembers`, from `scripts/lib/members.ts` (existing: `deriveMembers(ethers, mnemonic)` returns `{ index, label, address, privateKey }[]`).
- Produces: `deployments/skillpass-43113.json` with `{ chainId, address, issuerName, deployer }`.

- [ ] **Step 1: Write the deploy script**

Create `scripts/skillpass/deploy.ts`:

```typescript
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
```

- [ ] **Step 2: Write the seed script**

Create `scripts/skillpass/seed.ts`. It issues two sample credentials to student wallets 1 and 2 using deterministic sample hashes (no real file needed for seeding).

```typescript
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
```

- [ ] **Step 3: Add package.json scripts**

In `package.json` `scripts`, add:

```json
    "deploy:skillpass": "hardhat run scripts/skillpass/deploy.ts --network fuji",
    "seed:skillpass": "hardhat run scripts/skillpass/seed.ts --network fuji",
```

- [ ] **Step 4: Verify deploy and seed against a local node**

```bash
npx hardhat node > /tmp/hh.log 2>&1 &
# wait for the node, then:
export DEMO_MNEMONIC="test test test test test test test test test test test junk"
npx hardhat run scripts/skillpass/deploy.ts --network localhost
npx hardhat run scripts/skillpass/seed.ts --network localhost
```
Expected: deploy prints an address and writes `deployments/skillpass-31337.json`; seed issues 2 credentials and prints `Total certificates: 2`. Then stop the node (`fuser -k 8545/tcp`) and remove the local file (`rm -f deployments/skillpass-31337.json`).

- [ ] **Step 5: Commit**

```bash
git add scripts/skillpass/deploy.ts scripts/skillpass/seed.ts package.json
git commit -m "feat(scripts): SkillPass deploy and seed"
```

---

### Task 5: Scaffold web-skillpass and install deps

**Files:**
- Create: `web-skillpass/` (via create-next-app)
- Modify: `web-skillpass/tsconfig.json`, `web-skillpass/next.config.ts`

- [ ] **Step 1: Scaffold the app**

```bash
cd /home/edward/projects/chamachain
npx --yes create-next-app@latest web-skillpass --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --turbopack --yes
```
Expected: `web-skillpass/` created with Next 16 + Tailwind v4.

- [ ] **Step 2: Install dependencies**

```bash
cd web-skillpass
npm install wagmi@^2.16.0 viem @tanstack/react-query @rainbow-me/rainbowkit framer-motion lucide-react sonner class-variance-authority clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-label
```
Expected: installs without a wagmi/RainbowKit peer error (wagmi pinned to v2).

- [ ] **Step 3: Fix tsconfig target and turbopack root**

In `web-skillpass/tsconfig.json` set `"target": "ES2020"`.

Replace `web-skillpass/next.config.ts` with:

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
git add web-skillpass
git commit -m "chore(web-skillpass): scaffold Next.js app and dependencies"
```

---

### Task 6: Reuse ChamaChain infrastructure and generate the ABI

**Files:**
- Create (copy from web-chama, no logic change): `web-skillpass/lib/utils.ts`, `web-skillpass/lib/errors.ts`, `web-skillpass/hooks/useNetwork.ts`, `web-skillpass/hooks/useTxRunner.ts`, `web-skillpass/components/ui/{button,card,input,badge,skeleton,dialog}.tsx`, `web-skillpass/components/ConnectWallet.tsx`, `web-skillpass/app/providers.tsx`, `web-skillpass/lib/wagmi.ts`
- Create: `web-skillpass/lib/skillpass/abi.ts`

**Interfaces:**
- Consumes: the compiled SkillPass artifact at `artifacts/contracts/SkillPass.sol/SkillPass.json`.
- Produces: `chamaTheme`-equivalent providers, `useNetwork()`, `useTxRunner()` (returns `{ runWith, write, isBusy }`), `cn()`, the UI primitives, and `skillPassAbi` exported `as const`.

- [ ] **Step 1: Copy the reusable files verbatim**

```bash
cd /home/edward/projects/chamachain
mkdir -p web-skillpass/lib/skillpass web-skillpass/hooks web-skillpass/components/ui
cp web-chama/lib/utils.ts web-skillpass/lib/utils.ts
cp web-chama/lib/errors.ts web-skillpass/lib/errors.ts
cp web-chama/hooks/useNetwork.ts web-skillpass/hooks/useNetwork.ts
cp web-chama/hooks/useTxRunner.ts web-skillpass/hooks/useTxRunner.ts
cp web-chama/components/ui/button.tsx web-skillpass/components/ui/button.tsx
cp web-chama/components/ui/card.tsx web-skillpass/components/ui/card.tsx
cp web-chama/components/ui/input.tsx web-skillpass/components/ui/input.tsx
cp web-chama/components/ui/badge.tsx web-skillpass/components/ui/badge.tsx
cp web-chama/components/ui/skeleton.tsx web-skillpass/components/ui/skeleton.tsx
cp web-chama/components/ui/dialog.tsx web-skillpass/components/ui/dialog.tsx
cp web-chama/components/ConnectWallet.tsx web-skillpass/components/ConnectWallet.tsx
cp web-chama/app/providers.tsx web-skillpass/app/providers.tsx
cp web-chama/lib/wagmi.ts web-skillpass/lib/wagmi.ts
```

These use Tailwind token class names (`bg-primary`, `text-ink`, etc). Task 7 redefines those tokens for the indigo palette, so the same primitives render in the SkillPass identity automatically.

Then fix the chama-specific imports and labels in the copied files:

- In `web-skillpass/hooks/useNetwork.ts` and `web-skillpass/hooks/useTxRunner.ts`, change the import path `@/lib/chama/config` to `@/lib/skillpass/config` (these copies reference `FUJI_CHAIN_ID` / `snowtraceTx`, which Task 8 defines in the skillpass config).
- In `web-skillpass/app/providers.tsx`, change the RainbowKit `lightTheme` `accentColor` from `"#0e3b36"` to `"#3a2db5"` and `accentColorForeground` to `"#f5f3ff"`.
- In `web-skillpass/components/ConnectWallet.tsx`, change the connect label text "Unganisha pochi" to "Connect wallet".

- [ ] **Step 2: Generate the ABI**

```bash
cd /home/edward/projects/chamachain
npx hardhat compile
node -e '
const fs = require("fs");
const abi = require("./artifacts/contracts/SkillPass.sol/SkillPass.json").abi;
const header = "// Generated from artifacts/contracts/SkillPass.sol/SkillPass.json\n\n";
fs.writeFileSync("web-skillpass/lib/skillpass/abi.ts", header + "export const skillPassAbi = " + JSON.stringify(abi, null, 2) + " as const;\n");
console.log("wrote web-skillpass/lib/skillpass/abi.ts");
'
```

- [ ] **Step 3: Commit**

```bash
git add web-skillpass/lib web-skillpass/hooks web-skillpass/components web-skillpass/app/providers.tsx
git commit -m "chore(web-skillpass): reuse chama infra and generate ABI"
```

---

### Task 7: SkillPass design tokens, fonts, and layout (distinct identity)

**Files:**
- Modify: `web-skillpass/app/globals.css`
- Modify: `web-skillpass/app/layout.tsx`

**Interfaces:**
- Produces: indigo/violet token set (`--color-base`, `--color-surface`, `--color-ink`, `--color-primary`, `--color-violet`, `--color-seal`, `--color-valid`, `--color-invalid`, `--color-line`), utilities `.font-display`, `.tnum`, `.foil`, and the keyframes `shimmer`, `fadeIn`, `popIn`. Fonts wired to `--font-sora`, `--font-onest`, `--font-plex`.

- [ ] **Step 1: Replace globals.css with the indigo passport tokens**

Replace `web-skillpass/app/globals.css` with:

```css
@import "tailwindcss";

/* SkillPass TZ tokens: cool official credential identity. Indigo and violet, foil seal,
   crisp white cards. Deliberately distinct from ChamaChain's warm earthy ledger. */
@theme {
  --color-base: #f5f4fb;
  --color-base-deep: #ebe9f7;
  --color-surface: #ffffff;
  --color-surface-sunk: #f1f0fb;

  --color-ink: #14122b;
  --color-ink-soft: #5b5878;
  --color-ink-faint: #908dad;

  --color-primary: #3a2db5;
  --color-primary-deep: #271d86;
  --color-primary-bright: #5b4ee6;
  --color-primary-tint: #e4e0fb;

  --color-violet: #7c3aed;
  --color-seal: #b8932f;
  --color-seal-tint: #f3e8c8;

  --color-valid: #1f9d6b;
  --color-invalid: #d23b53;

  --color-line: #e3e0f3;
  --color-line-strong: #cdc8ec;

  --color-gold: var(--color-seal);
  --color-gold-bright: var(--color-seal);

  --font-display: var(--font-sora), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--font-onest), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex), ui-monospace, "SF Mono", monospace;

  --radius-card: 1.25rem;

  --shadow-soft: 0 1px 2px rgba(20, 18, 43, 0.04), 0 10px 30px -12px rgba(20, 18, 43, 0.14);
  --shadow-lift: 0 2px 6px rgba(20, 18, 43, 0.07), 0 24px 60px -20px rgba(39, 29, 134, 0.28);

  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
}

@layer base {
  body {
    background-color: var(--color-base);
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
  /* Foil seal gradient for the verification stamp. */
  .foil {
    background-image: conic-gradient(
      from 140deg,
      var(--color-seal),
      #e9d28a,
      var(--color-seal),
      #d9b85a,
      var(--color-seal)
    );
  }
  .grid-paper {
    background-image: linear-gradient(var(--color-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-line) 1px, transparent 1px);
    background-size: 26px 26px;
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes popIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes sealIn {
  from { opacity: 0; transform: rotate(-18deg) scale(1.6); }
  to { opacity: 1; transform: rotate(-8deg) scale(1); }
}
```

- [ ] **Step 2: Replace layout.tsx with the distinct fonts**

Replace `web-skillpass/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import { Sora, Onest, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const onest = Onest({ subsets: ["latin"], variable: "--font-onest", display: "swap" });
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillPass TZ | Verifiable credentials on-chain",
  description:
    "Institutions issue soulbound certificates to a student's wallet. Anyone can verify them instantly.",
};

export const viewport: Viewport = {
  themeColor: "#3a2db5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${onest.variable} ${plex.variable} h-full antialiased`}
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
git add web-skillpass/app/globals.css web-skillpass/app/layout.tsx
git commit -m "feat(web-skillpass): indigo passport design tokens and fonts"
```

---

### Task 8: SkillPass lib and hooks (config, hashing, demo signer, reads/writes)

**Files:**
- Create: `web-skillpass/lib/skillpass/config.ts`, `web-skillpass/lib/skillpass/contract.ts`, `web-skillpass/lib/skillpass/types.ts`, `web-skillpass/lib/skillpass/demo.ts`, `web-skillpass/lib/hash.ts`
- Create: `web-skillpass/hooks/useCertificates.ts`, `web-skillpass/hooks/useIssueCertificate.ts`, `web-skillpass/hooks/useRevoke.ts`

**Interfaces:**
- Consumes: `skillPassAbi` (Task 6), `useTxRunner` (Task 6).
- Produces: `CHAMA`-equivalent `SKILLPASS_ADDRESS`, `IS_CONFIGURED`, `FUJI`, `snowtraceAddress`; `skillPassContract`; `Certificate` type; `sha256OfFile(file) => Promise<0x...>`; `demoIssuerClient()`; `useCertificatesOf(addr)`, `useCertificate(id)`, `useVerifyByHash(hash)`; `useIssueCertificate(onConfirmed)` returns `{ issue, isBusy }`; `useRevoke(onConfirmed)` returns `{ revoke, isBusy }`.

- [ ] **Step 1: Create config, contract, and types**

`web-skillpass/lib/skillpass/config.ts`:

```typescript
import { avalancheFuji } from "wagmi/chains";

export const FUJI = avalancheFuji;
export const FUJI_CHAIN_ID = avalancheFuji.id;

const rawAddress = process.env.NEXT_PUBLIC_SKILLPASS_ADDRESS ?? "";
export const SKILLPASS_ADDRESS = rawAddress as `0x${string}`;
export const IS_CONFIGURED = /^0x[0-9a-fA-F]{40}$/.test(rawAddress);

export const SNOWTRACE_BASE = "https://testnet.snowtrace.io";
export const snowtraceTx = (h: string) => `${SNOWTRACE_BASE}/tx/${h}`;
export const snowtraceAddress = (a: string) => `${SNOWTRACE_BASE}/address/${a}`;
```

`web-skillpass/lib/skillpass/contract.ts`:

```typescript
import { skillPassAbi } from "./abi";
import { SKILLPASS_ADDRESS } from "./config";

export const skillPassContract = {
  address: SKILLPASS_ADDRESS,
  abi: skillPassAbi,
} as const;
```

`web-skillpass/lib/skillpass/types.ts`:

```typescript
export interface Certificate {
  id: bigint;
  student: `0x${string}`;
  issuer: `0x${string}`;
  course: string;
  fileName: string;
  fileHash: `0x${string}`;
  issuedAt: bigint;
  revoked: boolean;
}
```

- [ ] **Step 2: Create the SHA-256 hashing helper**

`web-skillpass/lib/hash.ts`:

```typescript
/// SHA-256 of a file's bytes as a 0x-prefixed 32-byte hex string, computed entirely in the
/// browser. The file never leaves the device; only this hash is stored on-chain.
export async function sha256OfFile(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}
```

- [ ] **Step 3: Create the demo signer (issue as the institution)**

`web-skillpass/lib/skillpass/demo.ts`:

```typescript
import { createWalletClient, http, type WalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { FUJI } from "./config";

const MNEMONIC = process.env.NEXT_PUBLIC_DEMO_MNEMONIC ?? "";
export const DEMO_ENABLED = MNEMONIC.trim().split(/\s+/).length >= 12;
const RPC_URL = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? FUJI.rpcUrls.default.http[0];

/// The institution is member index 0. This wallet client lets the demo issue credentials
/// without a browser wallet popup. Testnet only.
export function demoIssuerClient(): WalletClient | null {
  if (!DEMO_ENABLED) return null;
  const account = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
  return createWalletClient({ account, chain: FUJI, transport: http(RPC_URL) });
}

export function demoStudentAddress(index: number): `0x${string}` {
  return mnemonicToAccount(MNEMONIC, { addressIndex: index }).address;
}
```

- [ ] **Step 4: Create the read hooks**

`web-skillpass/hooks/useCertificates.ts`:

```typescript
"use client";

import { useReadContract } from "wagmi";
import { skillPassContract } from "@/lib/skillpass/contract";
import { IS_CONFIGURED } from "@/lib/skillpass/config";
import type { Certificate } from "@/lib/skillpass/types";

export function useCertificatesOf(student?: `0x${string}`) {
  const query = useReadContract({
    ...skillPassContract,
    functionName: "certificatesOf",
    args: student ? [student] : undefined,
    query: { enabled: IS_CONFIGURED && Boolean(student), refetchInterval: 6000 },
  });
  return {
    certificates: (query.data as Certificate[] | undefined) ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useCertificate(id?: bigint) {
  const query = useReadContract({
    ...skillPassContract,
    functionName: "getCertificate",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: IS_CONFIGURED && id !== undefined },
  });
  return {
    certificate: query.data as Certificate | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
```

- [ ] **Step 5: Create the write hooks**

`web-skillpass/hooks/useIssueCertificate.ts`:

```typescript
"use client";

import { useCallback } from "react";
import { skillPassContract } from "@/lib/skillpass/contract";
import { skillPassAbi } from "@/lib/skillpass/abi";
import { FUJI } from "@/lib/skillpass/config";
import { demoIssuerClient } from "@/lib/skillpass/demo";
import { useTxRunner } from "./useTxRunner";

export function useIssueCertificate(onConfirmed?: () => void) {
  const { runWith, write, isBusy } = useTxRunner();

  const issueConnected = useCallback(
    (student: `0x${string}`, course: string, fileName: string, fileHash: `0x${string}`) =>
      runWith(
        () =>
          write({
            ...skillPassContract,
            functionName: "issueCertificate",
            args: [student, course, fileName, fileHash],
          }),
        {
          submitting: "Issuing credential...",
          pending: "Waiting for confirmation...",
          success: "Credential issued",
        },
        onConfirmed,
      ),
    [runWith, write, onConfirmed],
  );

  const issueAsInstitution = useCallback(
    (student: `0x${string}`, course: string, fileName: string, fileHash: `0x${string}`) => {
      const client = demoIssuerClient();
      if (!client || !client.account) return Promise.resolve(false);
      const account = client.account;
      return runWith(
        () =>
          client.writeContract({
            address: skillPassContract.address,
            abi: skillPassAbi,
            functionName: "issueCertificate",
            args: [student, course, fileName, fileHash],
            account,
            chain: FUJI,
          }),
        {
          submitting: "Institution is issuing...",
          pending: "Waiting for confirmation...",
          success: "Credential issued",
        },
        onConfirmed,
      );
    },
    [runWith, onConfirmed],
  );

  return { issueConnected, issueAsInstitution, isBusy };
}
```

`web-skillpass/hooks/useRevoke.ts`:

```typescript
"use client";

import { useCallback } from "react";
import { skillPassContract } from "@/lib/skillpass/contract";
import { useTxRunner } from "./useTxRunner";

export function useRevoke(onConfirmed?: () => void) {
  const { runWith, write, isBusy } = useTxRunner();

  const revoke = useCallback(
    (id: bigint) =>
      runWith(
        () => write({ ...skillPassContract, functionName: "revoke", args: [id] }),
        {
          submitting: "Revoking...",
          pending: "Waiting for confirmation...",
          success: "Credential revoked",
        },
        onConfirmed,
      ),
    [runWith, write, onConfirmed],
  );

  return { revoke, isBusy };
}
```

- [ ] **Step 6: Commit**

```bash
cd /home/edward/projects/chamachain
git add web-skillpass/lib web-skillpass/hooks
git commit -m "feat(web-skillpass): config, hashing, demo signer, and chain hooks"
```

---

### Task 9: SkillPass components and the three role surfaces

**Files:**
- Create: `web-skillpass/lib/format.ts`, `web-skillpass/components/SiteHeader.tsx`, `web-skillpass/components/VerificationSeal.tsx`, `web-skillpass/components/CredentialCard.tsx`, `web-skillpass/components/OnChainOffChainPanel.tsx`, `web-skillpass/components/FileHashDrop.tsx`, `web-skillpass/components/VerifyPanel.tsx`, `web-skillpass/components/IssueForm.tsx`, `web-skillpass/components/SetupNotice.tsx`
- Create: `web-skillpass/app/page.tsx`, `web-skillpass/app/issue/page.tsx`, `web-skillpass/app/verify/page.tsx`, `web-skillpass/app/passport/[address]/page.tsx`

**Interfaces:**
- Consumes: all hooks and lib from Task 8, UI primitives from Task 6.
- Produces: the verifier home, issuer console, verifier page, and passport page.

- [ ] **Step 1: Create format helpers**

`web-skillpass/lib/format.ts`:

```typescript
export function truncate(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

export function formatDate(unixSeconds: bigint | number): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
```

- [ ] **Step 2: Create the verification seal, credential card, and on/off-chain panel**

`web-skillpass/components/VerificationSeal.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldX } from "lucide-react";

export function VerificationSeal({ status }: { status: "valid" | "revoked" | "unknown" }) {
  const valid = status === "valid";
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -18, scale: 1.5 }}
      animate={{ opacity: 1, rotate: -8, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 16 }}
      className="relative grid h-20 w-20 place-items-center rounded-full"
    >
      <span className={`absolute inset-0 rounded-full ${valid ? "foil" : "bg-invalid"}`} />
      <span className="absolute inset-1 rounded-full bg-surface" />
      {valid ? (
        <ShieldCheck className="relative h-9 w-9 text-valid" />
      ) : (
        <ShieldX className="relative h-9 w-9 text-invalid" />
      )}
    </motion.div>
  );
}
```

`web-skillpass/components/OnChainOffChainPanel.tsx`:

```tsx
import { Database, FileLock2 } from "lucide-react";
import type { Certificate } from "@/lib/skillpass/types";
import { truncate } from "@/lib/format";

export function OnChainOffChainPanel({ certificate }: { certificate: Certificate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-surface-sunk p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Database className="h-3.5 w-3.5" /> On-chain
        </p>
        <dl className="space-y-1 text-sm text-ink">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">Course</dt>
            <dd className="font-medium">{certificate.course}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">File hash</dt>
            <dd className="font-mono text-xs">{truncate(certificate.fileHash, 8, 6)}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-xl border border-line bg-surface-sunk p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <FileLock2 className="h-3.5 w-3.5" /> Off-chain
        </p>
        <p className="text-sm text-ink">
          The file <span className="font-medium">{certificate.fileName}</span> stays with the
          holder. Only its hash is stored on-chain, so anyone can prove a file matches without the
          file being public.
        </p>
      </div>
    </div>
  );
}
```

`web-skillpass/components/CredentialCard.tsx`:

```tsx
import { BadgeCheck, Ban } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { truncate, formatDate } from "@/lib/format";
import { snowtraceAddress } from "@/lib/skillpass/config";
import type { Certificate } from "@/lib/skillpass/types";

export function CredentialCard({ certificate }: { certificate: Certificate }) {
  const revoked = certificate.revoked;
  return (
    <Card className="overflow-hidden">
      <div className="foil h-1.5 w-full" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Credential #{certificate.id.toString()}
            </p>
            <h3 className="mt-0.5 font-display text-lg font-semibold text-ink">
              {certificate.course}
            </h3>
          </div>
          {revoked ? (
            <Badge variant="outline" className="!text-invalid">
              <Ban className="h-3.5 w-3.5" /> Revoked
            </Badge>
          ) : (
            <Badge variant="teal">
              <BadgeCheck className="h-3.5 w-3.5" /> Valid
            </Badge>
          )}
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">Holder</dt>
            <dd className="font-mono">{truncate(certificate.student)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-soft">Issued</dt>
            <dd>{formatDate(certificate.issuedAt)}</dd>
          </div>
        </dl>
        <a
          href={snowtraceAddress(certificate.student)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
        >
          View holder on Snowtrace
        </a>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create the file hash drop, site header, and setup notice**

`web-skillpass/components/FileHashDrop.tsx`:

```tsx
"use client";

import { useState } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { sha256OfFile } from "@/lib/hash";
import { truncate } from "@/lib/format";

export function FileHashDrop({
  onHash,
  label = "Drop the certificate PDF",
}: {
  onHash: (hash: `0x${string}` | null, fileName: string) => void;
  label?: string;
}) {
  const [name, setName] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    const h = await sha256OfFile(file);
    setName(file.name);
    setHash(h);
    onHash(h, file.name);
  }

  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-sunk px-4 py-6 text-center transition-colors hover:border-primary-bright">
      <input
        type="file"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      {hash ? (
        <>
          <FileCheck2 className="h-6 w-6 text-valid" />
          <p className="text-sm font-medium text-ink">{name}</p>
          <p className="font-mono text-xs text-ink-soft">{truncate(hash, 10, 8)}</p>
        </>
      ) : (
        <>
          <UploadCloud className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-xs text-ink-soft">Hashed in your browser, the file is not uploaded</p>
        </>
      )}
    </label>
  );
}
```

`web-skillpass/components/SiteHeader.tsx`:

```tsx
import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3" y="5" width="26" height="22" rx="4" stroke="var(--color-primary)" strokeWidth="1.6" />
      <circle cx="11" cy="13" r="3.4" fill="var(--color-violet)" />
      <path d="M18 11.5h7M18 16h7M7 21h18" stroke="var(--color-primary-bright)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-ink">SkillPass TZ</p>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint sm:block">
              Verifiable credentials
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <Link href="/verify" className="hidden rounded-full px-3 py-1.5 hover:bg-surface-sunk sm:block">
            Verify
          </Link>
          <Link href="/issue" className="hidden rounded-full px-3 py-1.5 hover:bg-surface-sunk sm:block">
            Issue
          </Link>
          <ConnectWallet />
        </nav>
      </div>
    </header>
  );
}
```

`web-skillpass/components/SetupNotice.tsx`:

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
          <h1 className="font-display text-xl font-semibold text-ink">Welcome to SkillPass TZ</h1>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          No contract is configured yet. Run <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">npm run deploy:skillpass</code>, then set
          <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_SKILLPASS_ADDRESS</code> in
          <code className="rounded bg-surface-sunk px-1.5 py-0.5 font-mono text-xs">web-skillpass/.env.local</code> and restart.
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create the verify panel and issue form**

`web-skillpass/components/VerifyPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useReadContract } from "wagmi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { VerificationSeal } from "./VerificationSeal";
import { OnChainOffChainPanel } from "./OnChainOffChainPanel";
import { FileHashDrop } from "./FileHashDrop";
import { skillPassContract } from "@/lib/skillpass/contract";
import { IS_CONFIGURED } from "@/lib/skillpass/config";
import { truncate } from "@/lib/format";
import type { Certificate } from "@/lib/skillpass/types";

export function VerifyPanel() {
  const [idInput, setIdInput] = useState("");
  const [lookupId, setLookupId] = useState<bigint | null>(null);
  const [droppedHash, setDroppedHash] = useState<`0x${string}` | null>(null);
  const [noFileMatch, setNoFileMatch] = useState(false);

  const certQuery = useReadContract({
    ...skillPassContract,
    functionName: "getCertificate",
    args: lookupId !== null ? [lookupId] : undefined,
    query: { enabled: IS_CONFIGURED && lookupId !== null },
  });

  const hashQuery = useReadContract({
    ...skillPassContract,
    functionName: "verifyByHash",
    args: droppedHash ? [droppedHash] : undefined,
    query: { enabled: IS_CONFIGURED && Boolean(droppedHash) },
  });

  // A dropped file resolves to an id via verifyByHash; id 0 means no certificate matches.
  useEffect(() => {
    if (hashQuery.data === undefined) return;
    const id = hashQuery.data as bigint;
    setLookupId(id > 0n ? id : null);
    setNoFileMatch(id === 0n);
  }, [hashQuery.data]);

  const issuerName = useReadContract({
    ...skillPassContract,
    functionName: "issuerName",
    args: certQuery.data ? [(certQuery.data as Certificate).issuer] : undefined,
    query: { enabled: Boolean(certQuery.data) },
  });

  const cert = certQuery.data as Certificate | undefined;
  const status: "valid" | "revoked" | "unknown" = cert
    ? cert.revoked
      ? "revoked"
      : "valid"
    : "unknown";

  function verifyById() {
    setDroppedHash(null);
    setNoFileMatch(false);
    setLookupId(idInput ? BigInt(idInput) : null);
  }

  function handleHash(hash: `0x${string}` | null) {
    setNoFileMatch(false);
    setDroppedHash(hash);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-ink">Verify by certificate id</p>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder="e.g. 1"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value.replace(/[^0-9]/g, ""))}
          />
          <Button onClick={verifyById} disabled={!idInput}>
            <Search className="h-4 w-4" /> Verify
          </Button>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink">Or match a file</p>
          <FileHashDrop onHash={handleHash} label="Drop a PDF to check its hash" />
          {noFileMatch && (
            <p className="mt-2 text-sm text-invalid">No on-chain credential matches this file.</p>
          )}
        </div>
      </Card>

      {lookupId !== null && (
        <Card className="p-6">
          {certQuery.isError ? (
            <p className="text-center text-sm text-invalid">No certificate with id {lookupId.toString()}.</p>
          ) : cert ? (
            <div className="flex flex-col items-center gap-5">
              <VerificationSeal status={status} />
              <div className="text-center">
                <h3 className="font-display text-xl font-semibold text-ink">{cert.course}</h3>
                <p className="text-sm text-ink-soft">
                  {status === "valid" ? "Genuine credential" : "This credential was revoked"}, issued by{" "}
                  <span className="font-medium text-ink">
                    {(issuerName.data as string | undefined) ?? truncate(cert.issuer)}
                  </span>
                </p>
              </div>
              <div className="w-full">
                <OnChainOffChainPanel certificate={cert} />
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-ink-soft">Looking up...</p>
          )}
        </Card>
      )}
    </div>
  );
}
```

`web-skillpass/components/IssueForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Award } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FileHashDrop } from "./FileHashDrop";
import { useIssueCertificate } from "@/hooks/useIssueCertificate";
import { demoStudentAddress, DEMO_ENABLED } from "@/lib/skillpass/demo";
import { useNetwork } from "@/hooks/useNetwork";

export function IssueForm({ onIssued }: { onIssued: () => void }) {
  const { isConnected, isFuji } = useNetwork();
  const { issueConnected, issueAsInstitution, isBusy } = useIssueCertificate(onIssued);

  const [student, setStudent] = useState("");
  const [course, setCourse] = useState("");
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [fileName, setFileName] = useState("");

  const valid = /^0x[0-9a-fA-F]{40}$/.test(student) && course.trim().length > 0 && hash !== null;

  async function submit(asInstitution: boolean) {
    if (!valid || hash === null) return;
    const recipient = student as `0x${string}`;
    const ok = asInstitution
      ? await issueAsInstitution(recipient, course.trim(), fileName, hash)
      : await issueConnected(recipient, course.trim(), fileName, hash);
    if (ok) {
      setStudent("");
      setCourse("");
      setHash(null);
      setFileName("");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-tint text-primary">
          <Award className="h-5 w-5" />
        </span>
        <h2 className="font-display text-lg font-semibold text-ink">Issue a credential</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Student wallet
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="0x..."
              value={student}
              onChange={(e) => setStudent(e.target.value.trim())}
              className="font-mono text-sm"
            />
            {DEMO_ENABLED && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStudent(demoStudentAddress(1))}>
                  Asha
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStudent(demoStudentAddress(2))}>
                  Juma
                </Button>
              </>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Course
          </label>
          <Input
            placeholder="Solidity Bootcamp 2026"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          />
        </div>
        <FileHashDrop onHash={(h, name) => { setHash(h); setFileName(name); }} />

        <Button
          size="lg"
          className="mt-1 w-full"
          disabled={!valid || isBusy || !isConnected || !isFuji}
          onClick={() => void submit(false)}
        >
          {isBusy ? "Issuing..." : "Issue with connected wallet"}
        </Button>
        {DEMO_ENABLED && (
          <Button
            variant="outline"
            size="md"
            className="w-full"
            disabled={!valid || isBusy}
            onClick={() => void submit(true)}
          >
            Issue as the institution (demo)
          </Button>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Create the four pages**

`web-skillpass/app/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/SiteHeader";
import { VerifyPanel } from "@/components/VerifyPanel";
import { SetupNotice } from "@/components/SetupNotice";
import { IS_CONFIGURED } from "@/lib/skillpass/config";

export default function Home() {
  if (!IS_CONFIGURED) {
    return (
      <div className="relative z-10">
        <SiteHeader />
        <SetupNotice />
      </div>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <section className="mb-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Verifiable credentials on-chain
            </p>
            <h1 className="mt-2 text-balance font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Prove a certificate is genuine in seconds
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
              Institutions issue soulbound credentials to a student wallet. Anyone can verify them.
              The file stays private, only its hash lives on-chain.
            </p>
            <div className="mt-4 flex justify-center gap-2 text-sm">
              <Link href="/issue" className="rounded-full bg-primary px-4 py-2 font-medium text-base text-[var(--color-base)]">
                Issue
              </Link>
              <Link href="/verify" className="rounded-full border border-line-strong px-4 py-2 font-medium text-ink">
                Verify
              </Link>
            </div>
          </section>
          <VerifyPanel />
        </main>
      </div>
    </TooltipProvider>
  );
}
```

Note: copy `web-chama/components/ui/tooltip.tsx` to `web-skillpass/components/ui/tooltip.tsx` first (it is imported above):

```bash
cp web-chama/components/ui/tooltip.tsx web-skillpass/components/ui/tooltip.tsx
```

`web-skillpass/app/issue/page.tsx`:

```tsx
"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { IssueForm } from "@/components/IssueForm";
import { SetupNotice } from "@/components/SetupNotice";
import { IS_CONFIGURED } from "@/lib/skillpass/config";

export default function IssuePage() {
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
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <IssueForm onIssued={() => undefined} />
      </main>
    </div>
  );
}
```

`web-skillpass/app/verify/page.tsx`:

```tsx
"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { VerifyPanel } from "@/components/VerifyPanel";
import { SetupNotice } from "@/components/SetupNotice";
import { IS_CONFIGURED } from "@/lib/skillpass/config";

export default function VerifyPage() {
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-semibold text-ink">Verify a credential</h1>
        <VerifyPanel />
      </main>
    </div>
  );
}
```

`web-skillpass/app/passport/[address]/page.tsx`:

```tsx
"use client";

import { use } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CredentialCard } from "@/components/CredentialCard";
import { SetupNotice } from "@/components/SetupNotice";
import { useCertificatesOf } from "@/hooks/useCertificates";
import { IS_CONFIGURED } from "@/lib/skillpass/config";
import { truncate } from "@/lib/format";

export default function PassportPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const holder = address as `0x${string}`;
  const { certificates, isLoading } = useCertificatesOf(holder);

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Skill passport
        </p>
        <h1 className="mt-1 font-mono text-xl font-semibold text-ink">{truncate(holder, 10, 8)}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {certificates.length} credential{certificates.length === 1 ? "" : "s"} held by this wallet
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-ink-soft">Loading credentials...</p>
        ) : certificates.length === 0 ? (
          <p className="mt-8 text-sm text-ink-soft">This wallet holds no credentials yet.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {certificates.map((c) => (
              <CredentialCard key={c.id.toString()} certificate={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Build the app to verify it compiles**

Run: `cd web-skillpass && npm run build && cd ..`
Expected: `Compiled successfully`, routes `/`, `/issue`, `/verify`, `/passport/[address]` listed.

- [ ] **Step 7: Commit**

```bash
git add web-skillpass
git commit -m "feat(web-skillpass): issuer, passport, and verifier surfaces"
```

---

### Task 10: Live verification and README

**Files:**
- Create: `web-skillpass/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create web-skillpass/.env.example**

```
NEXT_PUBLIC_SKILLPASS_ADDRESS=0xyour_deployed_skillpass_address
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_DEMO_MNEMONIC="your throwaway twelve word testnet mnemonic here"
NEXT_PUBLIC_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

- [ ] **Step 2: Deploy and seed on Fuji, then verify the live flow**

```bash
npm run deploy:skillpass    # prints address, writes deployments/skillpass-43113.json
# set NEXT_PUBLIC_SKILLPASS_ADDRESS in web-skillpass/.env.local (+ NEXT_PUBLIC_DEMO_MNEMONIC)
npm run seed:skillpass      # issues 2 sample credentials
cd web-skillpass && npm run dev
```
Confirm: `/verify` with id `1` shows a GENUINE seal and the on-chain/off-chain panel; `/passport/<student 1 address>` shows the credential; `/issue` issues a new one (as institution); revoking then re-verifying shows REVOKED.

- [ ] **Step 3: Update the root README**

Add a "Projects" section near the top of `README.md` listing the three apps (ChamaChain in `web-chama`, SkillPass TZ in `web-skillpass`, MazaoTrace planned), and a "SkillPass TZ" section with the deploy/seed/run commands above and a one-line note that the certificate file is hashed in the browser (on-chain hash, off-chain file).

- [ ] **Step 4: Commit**

```bash
git add web-skillpass/.env.example README.md
git commit -m "docs: SkillPass setup and run steps"
```

---

## Self-Review notes

- Spec coverage: issuer registry (Task 1), soulbound issuance (Task 2), revoke + views + tokenURI + verifyByHash (Task 3), deploy/seed (Task 4), the three role surfaces and on-chain/off-chain panel (Tasks 6 to 9), distinct indigo UI (Task 7), client-side hashing (Task 8 `lib/hash.ts`), wallet-role reuse (Task 4 seed + Task 8 demo). Monorepo restructure (Task 0). MazaoTrace is intentionally out of scope (separate cycle).
- Soulbound, unique-hash, and id-from-1 constraints are enforced in the contract (Task 2) and exercised by tests.
- The reused files (Task 6) are real artifacts in `web-chama`, copied verbatim, so they are not plan-internal cross-references.
