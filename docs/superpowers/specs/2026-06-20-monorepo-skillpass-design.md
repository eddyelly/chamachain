# Design: Monorepo restructure + SkillPass TZ

Date: 2026-06-20
Status: approved (design), pending spec review
Scope: this document covers two units of work, (A) restructuring the repo into a 3-project
monorepo and (B) building SkillPass TZ. MazaoTrace is sketched in an appendix and will get its
own spec and plan cycle.

## Goals

- Host three independent dApps in one repo: ChamaChain (done), SkillPass TZ, MazaoTrace.
- Each dApp has its own contract, its own deploy/seed scripts, and its own frontend with a
  distinct visual identity.
- Reuse the five mnemonic-derived wallets as demo roles. Accounts 0, 1, 2 are funded on Fuji.
- Keep everything student-level and cheap (gas only for SkillPass, tiny escrow amounts later for
  MazaoTrace). Never touch ChamaChain's live contract or deployment.

## Part A: Monorepo restructure

Target layout:

```
chamachain/
  contracts/    ChamaGroup.sol   SkillPass.sol   MazaoTrace.sol
                test/MaliciousRecipient.sol (existing, chama only)
  test/         ChamaGroup.test.ts   SkillPass.test.ts   MazaoTrace.test.ts
  scripts/      chama/{deploy,seed}.ts
                skillpass/{deploy,seed}.ts
                mazao/{deploy,seed}.ts
                lib/members.ts (shared wallet derivation, already exists)
  deployments/  chama-43113.json   skillpass-43113.json   mazao-43113.json
  hardhat.config.ts   (unchanged, compiles all contracts)
  web-chama/    (today's web/, renamed, otherwise untouched)
  web-skillpass/
  web-mazao/
  README.md     (becomes an index pointing at each project)
```

Changes:

- Move `web/` to `web-chama/`. No code changes inside it. Its `.env.local` keeps the deployed
  ChamaGroup address.
- Move `scripts/deploy.ts` and `scripts/seed.ts` to `scripts/chama/`. Keep `scripts/lib/members.ts`
  shared. Each project gets its own `deploy.ts` and `seed.ts` under its own folder.
- Each deploy script writes `deployments/<project>-<chainId>.json` so records do not collide (all
  three deploy to chain 43113).
- `package.json` scripts: `deploy:chama`, `seed:chama`, `deploy:skillpass`, `seed:skillpass`,
  `deploy:mazao`, `seed:mazao`, plus `compile` and `test` (run all suites).
- Root `.env` stays shared (one `PRIVATE_KEY`, one `DEMO_MNEMONIC`) since all three reuse the same
  wallets. Each frontend has its own `.env.local` with its own `NEXT_PUBLIC_*_ADDRESS`.
- `.gitignore` already covers `web/.next` etc; add the new web app build dirs.

This restructure is mechanical and must keep ChamaChain compiling, its tests passing, and its
frontend building exactly as before.

## Part B: SkillPass TZ

A verifiable certificate system and skill passport. Institutions issue credentials to a student's
wallet as soulbound NFTs; the wallet becomes a public skill passport; anyone can verify a
credential's authenticity.

### Roles (mapped to wallets)

- Issuer (institution): account index 0 (the funded deployer). Registered in an issuer allowlist.
- Students (credential holders): account indexes 1 and 2 (funded), optionally 3 and 4.
- Verifier: anyone. Read-only, needs no wallet.

### On-chain vs off-chain

- On-chain: a SHA-256 `fileHash` of the certificate PDF (bytes32), plus course, issuer, file name,
  issue date, and revoked flag. Plus the issuer allowlist and issuer names.
- Off-chain: the PDF file itself. It never leaves the browser. The issuer computes the hash locally
  with the Web Crypto API; the verifier recomputes it from a re-uploaded file to confirm a match.
- The UI shows an explicit "stored on-chain / kept off-chain" panel so the split is obvious to
  judges.

### Contract: `SkillPass.sol`

OpenZeppelin v5 `ERC721` + `Ownable`. Token ids start at 1 (so a zero lookup means "not found").

State:

- `mapping(address => bool) isIssuer`, `mapping(address => string) issuerName`
- `struct Certificate { uint256 id; address student; address issuer; string course; string fileName; bytes32 fileHash; uint64 issuedAt; bool revoked; }`
- `mapping(uint256 => Certificate) certificates`
- `mapping(address => uint256[]) studentTokens`
- `mapping(bytes32 => uint256) tokenIdByHash` (for verify-by-file; enforces unique file hash)
- `uint256 nextId` (starts at 1)

Functions:

- `constructor(string name_, string symbol_, string firstIssuerName)`: sets owner to deployer and
  registers the deployer as the first issuer with `firstIssuerName`.
- `addIssuer(address issuer, string name)` onlyOwner: extend the institution allowlist.
- `issueCertificate(address student, string course, string fileName, bytes32 fileHash)` onlyIssuer
  returns `uint256 id`: requires student nonzero, fileHash nonzero, and `tokenIdByHash[fileHash] == 0`
  (file not already certified). Mints a soulbound token to `student`, stores the Certificate, records
  `studentTokens` and `tokenIdByHash`, emits `CertificateIssued`.
- `revoke(uint256 id)`: only the issuing institution (`certificates[id].issuer == msg.sender`) or the
  owner. Sets `revoked = true`, emits `CertificateRevoked`.
- Views: `getCertificate(id)`, `certificatesOf(address)` returns `Certificate[]`, `isValid(id)` returns
  `_exists && !revoked`, `verifyByHash(bytes32)` returns the matching id (0 if none),
  `totalCertificates()`.
- `tokenURI(id)` override: returns a base64 data URI JSON (name, course, issuer, status) so the
  credential displays nicely in wallets.

Soulbound mechanism: override `_update(to, tokenId, auth)`; call `super._update`, then
`require(from == address(0), "SkillPass: soulbound, non-transferable")`. Minting (from == zero) is
allowed; every transfer reverts. Tokens are never burned (revocation is a flag), keeping the
passport history intact.

Events: `IssuerAdded(address issuer, string name)`, `CertificateIssued(uint256 indexed id, address indexed student, address indexed issuer, string course, bytes32 fileHash)`, `CertificateRevoked(uint256 indexed id)`.

### Tests (Hardhat)

- Issuing mints a soulbound token to the student and records the certificate fields.
- Any transfer attempt reverts (soulbound).
- Only an allowlisted issuer can issue; a non-issuer reverts.
- Duplicate file hash is rejected.
- Only the issuing institution or owner can revoke; `isValid` flips to false after revoke.
- `certificatesOf` returns all of a student's credentials in order.
- `verifyByHash` returns the right id for a known file and 0 for an unknown file.
- `addIssuer` is owner only.

### Frontend: `web-skillpass`

Same layered architecture as ChamaChain: `lib/` (config, abi, contract, format, sha256 hashing,
demo signer), `hooks/` (all chain reads and writes), `components/` (presentational), `app/` (routes).
Fuji only, wagmi + viem + RainbowKit, framer-motion, sonner.

Routes:

- `/` home: a hero plus a quick verify box (paste cert id or wallet) and navigation to Issue and
  Passport.
- `/issue` issuer console: connect as the institution, enter student wallet and course, drop a PDF
  (hash computed in-browser), issue. Demo signer can act as the institution.
- `/passport/[address]` skill passport: a public page listing all of a wallet's credentials as
  verified cards; the portfolio that accumulates over time.
- `/verify` verifier: paste a cert id or wallet, or re-upload a PDF; shows GENUINE / FORGED / REVOKED,
  the issuing institution, and the on-chain vs off-chain breakdown.

Hashing: `crypto.subtle.digest("SHA-256", fileBytes)` rendered as `0x...` bytes32.

### Distinct UI direction

Deliberately unlike ChamaChain's warm earthy ledger. An official credential and passport feel:
cool midnight indigo and violet, a foil silver or gold verification seal, crisp white credential
cards with a stamp or seal motif, and sharp geometric type (a distinctive display face paired with a
clean grotesque and a mono for ids and hashes). Where chama is warm and human, SkillPass is cool,
official, and precise. Tokens defined once in its own `globals.css`.

### Demo flow (SkillPass)

1. Issuer (wallet 0) opens `/issue`, issues "Solidity Bootcamp 2026" to student wallet 1, dropping in
   a PDF. The hash goes on-chain; a soulbound NFT mints to wallet 1.
2. Open `/passport/<wallet 1>`: the credential card appears, verified.
3. Verifier opens `/verify`, pastes the cert id or wallet 1: GENUINE, issued by the institution, with
   the on-chain vs off-chain panel. Re-upload the same PDF: hash matches. Upload a different PDF: no
   match (forged).
4. Issuer revokes the credential: the verifier now shows REVOKED.

## Out of scope (YAGNI)

- Real IPFS or any backend file storage (client-side hashing only).
- Batch issuance, credential expiry, ENS names, multi-file certificates.
- Changing ChamaChain's contract or its live deployment.

## Appendix: MazaoTrace (separate spec and plan later)

`MazaoTrace.sol`: register a produce batch (crop = cashew; a QR encodes the batch id), record supply
chain events (`confirmPickup` by transporter, `confirmDelivery` by buyer), and hold the buyer's
payment in escrow that auto-releases to the farmer on delivery confirmation. Tiny amounts
(0.0004 AVAX). Roles: farmer = 0, transporter = 1, buyer = 2. UI: a bright field-to-market horizontal
journey/stepper (Registered, Picked up, Delivered, Paid) with a QR flow, distinct from chama's
vertical ledger. Full design in its own document before implementation.
