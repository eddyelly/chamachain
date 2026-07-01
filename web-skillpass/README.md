# SkillPass TZ (web-skillpass)

Verifiable, tamper-proof credentials on the Avalanche Fuji testnet. Institutions issue
**soulbound** (non-transferable) certificate NFTs to a student's wallet, and that wallet becomes a
public skill passport anyone can verify instantly. `web-skillpass` is the Next.js app for issuing,
holding, and verifying credentials, including a verify-by-file flow that hashes a document in the
browser and checks it on-chain.

This README documents what the app does, how it is built, and the full stack, so it can be lifted
straight into a deck.

**Live demo:** https://skillpasstz.vercel.app

---

## 1. What it is (the elevator pitch)

- Paper certificates are easy to forge and slow to verify. A diploma is only as trustworthy as the
  registrar you can reach by phone.
- SkillPass TZ issues each credential as a **soulbound NFT** bound to the student's wallet: it
  cannot be sold or transferred, so it always represents the real holder.
- Anyone can verify a credential in seconds, either by looking up a wallet's passport or by
  dropping the original file and checking its hash against the chain.

## 2. The on-chain model (`SkillPass.sol`)

A single Solidity contract (Solidity `^0.8.24`, OpenZeppelin v5 `ERC721` + `Ownable` + `Base64`) is
the source of truth.

**Roles and issuance**
- The deployer is the first **issuer** (institution). The owner can `addIssuer(address, name)` to
  onboard more institutions.
- `issueCertificate(student, course, fileName, fileHash)` (issuers only): mints a certificate NFT
  to the student. The same file hash cannot be certified twice (anti-duplicate guard). Token ids
  start at 1.

**Soulbound**
- The internal `_update` override allows minting but reverts every transfer, so a credential is
  permanently bound to the student's wallet.

**Verification and lifecycle**
- `verifyByHash(fileHash)`: returns the token id for a document hash (the verify-a-file path).
- `isValid(id)`: true if the certificate exists and is not revoked.
- `certificatesOf(student)`: the wallet's full passport.
- `revoke(id)` (issuer or owner): flips a credential to revoked (for example, a rescinded award).
- `tokenURI(id)`: fully **on-chain** Base64-encoded JSON metadata (course, issuer, valid/revoked
  status), so the NFT needs no external host.
- `getCertificate`, `totalCertificates`: detail and counts.

**Events**: `IssuerAdded`, `CertificateIssued`, `CertificateRevoked`.

## 3. Privacy by design (hash, do not upload)

The actual document never leaves the user's device. The browser computes the file's **SHA-256**
hash (`lib/hash.ts`, via the Web Crypto API) and only that 32-byte hash is stored on-chain. To
verify, a checker re-drops the same file: matching hashes prove the document is the certified
original, without ever exposing its contents.

## 4. Features (what is on the screen)

- **Home** (`/`): the landing and entry point into issuing, verifying, and passports.
- **Issue** (`/issue`): an institution fills in the student, course, and document, the file is
  hashed locally, and the credential is minted on-chain.
- **Verify** (`/verify`): drop a file, hash it in the browser, and instantly see whether it is a
  valid on-chain credential, with a foil verification seal on a match.
- **Passport** (`/passport/[address]`): a wallet's public collection of credentials, each shown as
  a card with issuer, course, issue date, and valid/revoked status.
- **On-chain vs off-chain panel**: makes explicit what lives on-chain (hash, issuer, status) versus
  off-chain (the document itself).
- **Wallet + setup states**: RainbowKit connect, a setup notice when no contract is configured.

## 5. Tech stack

**Frontend framework**
- Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 (strict, no `any`).

**Web3**
- wagmi v2 and viem v2 for typed contract reads/writes.
- RainbowKit v2 for wallet connection.
- TanStack Query (React Query) for caching and polling.
- Chain: Avalanche Fuji testnet (chain id 43113), Snowtrace explorer.

**UI and styling**
- Tailwind CSS v4 (theme tokens in `globals.css`).
- framer-motion for animation (including the seal stamp), sonner for toast lifecycle, lucide-react
  for icons.
- Web Crypto API (`crypto.subtle`) for in-browser SHA-256 file hashing.
- Radix UI primitives (dialog, tooltip, label, slot), class-variance-authority + clsx +
  tailwind-merge.
- Fonts: Sora (display), Onest (body), IBM Plex Mono (numbers, hashes, addresses).

**Contracts and tooling** (repo root, shared across apps)
- Hardhat 3, Solidity 0.8.24, OpenZeppelin v5.
- 13 Hardhat tests covering the issuer registry, issuance, soulbound transfer block, duplicate-hash
  rejection, revocation, and the on-chain tokenURI.
- Deploy and seed scripts for Fuji (`npm run deploy:skillpass`, `npm run seed:skillpass`).

## 6. Branding (indigo and violet with a gold foil seal)

A "cool official credential" identity: indigo and violet with a gold foil seal on crisp white
cards, deliberately distinct from ChamaChain's warm earthy ledger and MazaoTrace's leaf green.
Theme color `#3a2db5`.

| Role | Token | Hex |
| --- | --- | --- |
| Primary (indigo) | `--color-primary` | `#3a2db5` |
| Primary deep | `--color-primary-deep` | `#271d86` |
| Primary bright | `--color-primary-bright` | `#5b4ee6` |
| Primary tint | `--color-primary-tint` | `#e4e0fb` |
| Violet accent | `--color-violet` | `#7c3aed` |
| Seal / gold | `--color-seal` | `#b8932f` |
| Seal tint | `--color-seal-tint` | `#f3e8c8` |
| Base / surface | `--color-base` / `--color-surface` | `#f5f4fb` / `#ffffff` |
| Ink | `--color-ink` | `#14122b` |
| Valid / invalid | `--color-valid` / `--color-invalid` | `#1f9d6b` / `#d23b53` |

Signature touches: a **conic-gradient gold foil seal** for the verification stamp (with a stamp-in
animation) and a faint **grid-paper** background, evoking official letterhead.

## 7. Architecture (clean layering)

The app follows a strict three-layer rule so components never touch the chain directly.

- **`lib/`**: configuration and clients. `skillpass/config.ts` (address + Fuji + Snowtrace helpers),
  `skillpass/abi.ts` (generated ABI), `skillpass/contract.ts`, `skillpass/types.ts` (`Certificate`),
  `skillpass/demo.ts` (demo issuer/student helpers), `hash.ts` (in-browser SHA-256), plus
  `wagmi.ts`, `format.ts`, `errors.ts`, `utils.ts`.
- **`hooks/`**: all chain reads and writes. `useCertificates` reads a wallet's passport and verifies
  hashes; `useIssueCertificate` and `useRevoke` are the writes, each routed through `useTxRunner`
  for a consistent submitted -> pending -> confirmed toast lifecycle; `useNetwork` handles
  connection and Fuji detection.
- **`components/`**: presentational only. Feature components (issue form, file-hash drop,
  credential card, verify panel, verification seal, on-chain/off-chain panel) plus a small `ui/`
  primitive set.

## 8. Demo signer mode

For a live pitch, the institution (issuer) account is derived from `NEXT_PUBLIC_DEMO_MNEMONIC` so
credentials can be issued without a wallet popup, and student wallet addresses are derived for the
passport view. Every issuance is a real Fuji transaction. This is testnet-only: the mnemonic ships
in the client bundle, so use only a throwaway testnet mnemonic with no real funds.

## 9. Configuration

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SKILLPASS_ADDRESS` | Deployed `SkillPass` address (printed by the deploy script). The app shows a setup notice until it is set. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables the WalletConnect QR option (injected wallets like MetaMask work without it). |
| `NEXT_PUBLIC_DEMO_MNEMONIC` | Throwaway testnet mnemonic for demo signer mode (issuer and students). |
| `NEXT_PUBLIC_FUJI_RPC_URL` | Optional RPC override (defaults to the public Fuji endpoint). |

## 10. Run it

From the repo root, deploy and seed the contract, then start the app:

```bash
npm run deploy:skillpass   # prints the SkillPass address
# set NEXT_PUBLIC_SKILLPASS_ADDRESS in web-skillpass/.env.local
npm run seed:skillpass     # issues a few demo credentials
cd web-skillpass && npm run dev   # http://localhost:3000
```

## The demo flow in four beats

1. An institution opens `/issue`, picks a student and course, and drops the certificate file. The
   browser hashes it locally.
2. The credential is minted as a soulbound NFT to the student's wallet, with only the hash on-chain.
3. Anyone opens `/verify`, drops the same file, and the app confirms it matches a valid on-chain
   credential, stamping a gold foil seal.
4. The student's `/passport/[address]` shows the credential permanently, with its valid or revoked
   status, and it can never be transferred away.

---

SkillPass TZ is one of three apps in the monorepo, alongside ChamaChain (m-of-n savings escrow) and
MazaoTrace (produce traceability with escrow). They share the same Hardhat setup and the same
layered frontend patterns, each with its own visual identity.
