# ChamaChain (web-chama)

A transparent digital savings group (chama / kikoba) on the Avalanche Fuji testnet. Members
pool AVAX into a shared treasury recorded as an immutable on-chain ledger, and payouts release
only when an m-of-n threshold of members approves (default 3 of 5). `web-chama` is the Next.js
dashboard that makes that flow visible and live: contributions, proposals, and the approval ring
all update in real time, and the threshold-th approval is the moment funds release.

This README documents what the app does, how it is built, and the full stack, so it can be lifted
straight into a deck.

**Live demo:** https://chamachain-psi.vercel.app

---

## 1. What it is (the elevator pitch)

- A **chama** is a rotating savings and credit group common across East Africa. Trust usually
  rests on a notebook and a treasurer.
- ChamaChain replaces the notebook with a smart contract: every contribution is an immutable
  ledger entry, the pooled balance is public, and no single person can move the money.
- Money leaves the pool only through an **m-of-n group vote** (default 3 of 5). The release is
  automatic the instant the threshold is reached, so the rules, not a treasurer, hold the funds.

## 2. The on-chain model (`ChamaGroup.sol`)

A single Solidity contract (Solidity `^0.8.24`, OpenZeppelin v5 `ReentrancyGuard`) is the source
of truth. The frontend only reads and writes to it.

**State**
- Fixed member set, fixed at construction: group name, members, human labels per member, and the
  approval threshold (n of m).
- Per-member running contribution totals, an append-only contribution ledger, and a list of
  payout proposals with their approval tallies.

**Actions**
- `contribute()` (payable, members only): adds an immutable ledger entry and updates the
  member's total. Zero contributions are rejected, and there is no `receive`/`fallback`, so the
  pooled balance always equals the sum of recorded contributions.
- `proposePayout(recipient, amount, reason)` (members only): opens a vote to release funds.
  Proposing is not an automatic approval, so the approval count stays an honest tally of distinct
  member signatures. The amount cannot exceed the current pool.
- `approvePayout(proposalId)` (members only, `nonReentrant`): records one approval per member and
  **auto-executes the payout the instant approvals reach the threshold**.

**Safety**
- Reentrancy guard plus checks-effects-interactions: the proposal is marked executed before the
  transfer, blocking reentrancy and double spend.
- `onlyMember` access control everywhere, one approval per member, explicit proposer approval.

**Events** (the live story the UI listens to): `ContributionMade`, `PayoutProposed`,
`PayoutApproved`, `PayoutExecuted`.

**Read views** powering the dashboard: `groupInfo` (name, threshold, member count, pooled
balance), `poolBalance`, `getLedger`, `getMembers` (addresses, labels, totals), `getProposals`,
`getApprovers` (who has signed a given proposal).

## 3. Features (what is on the screen)

- **Group hero**: group name, live pooled balance (animated), and the n-of-m threshold badge.
- **Members row**: every member with their label and running contribution total, with the
  connected wallet highlighted as "you".
- **Contribution ledger timeline**: the full immutable history of contributions, newest activity
  visible, each tied to a member.
- **Contribute card**: a member adds AVAX to the shared pool in one transaction.
- **Proposals panel**: open a payout proposal (recipient, amount, reason) and see every active and
  past vote.
- **Approval ring**: a 3-of-5 ring that fills in real time, showing how many more approvals are
  needed and which members have already signed.
- **Auto-release + celebration**: when the final approval lands, the escrow releases to the
  recipient and the UI celebrates as the balance updates.
- **Verified on-chain**: links out to Snowtrace for the contract and transactions.
- **Wallet + network awareness**: RainbowKit connect, plus a banner/pill that flags a wrong
  network (the app supports Fuji only).
- **Graceful states**: a loading skeleton, an error card, and a setup notice when no contract
  address is configured yet.

## 4. Tech stack

**Frontend framework**
- Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 (strict, no `any`).

**Web3**
- wagmi v2 and viem v2 for typed contract reads/writes.
- RainbowKit v2 for wallet connection.
- TanStack Query (React Query) for caching and polling.
- Chain: Avalanche Fuji testnet (chain id 43113), Snowtrace explorer.

**UI and styling**
- Tailwind CSS v4 (theme tokens defined in `globals.css`).
- framer-motion for animation, sonner for toast lifecycle, lucide-react for icons.
- Radix UI primitives (dialog, tooltip, label, slot) under thin local wrappers, with
  class-variance-authority + clsx + tailwind-merge.
- Fonts: Fraunces (display serif), Hanken Grotesk (body sans), JetBrains Mono (numbers and
  addresses).

**Contracts and tooling** (repo root, shared across apps)
- Hardhat 3, Solidity 0.8.24, OpenZeppelin v5.
- 24 Hardhat tests covering the ledger, access control, threshold logic, and reentrancy.
- Deploy and seed scripts for Fuji (`npm run deploy:chama`, `npm run seed:chama`).

## 5. Architecture (clean layering)

The app follows a strict three-layer rule so components never touch the chain directly.

- **`lib/`**: configuration and clients. `chama/config.ts` (address + Fuji + Snowtrace helpers),
  `chama/abi.ts` (generated ABI), `chama/contract.ts`, `chama/types.ts`, `chama/demo.ts` (demo
  signer), plus `wagmi.ts`, `format.ts`, `errors.ts`, `utils.ts`.
- **`hooks/`**: all chain reads and writes. `useGroupData` batches the group reads via a single
  multicall and polls every 6 seconds; `useContribute`, `useProposePayout`, and `useApprovePayout`
  are the writes, each routed through `useTxRunner` for a consistent submitted -> pending ->
  confirmed toast lifecycle; `useNetwork` handles connection and Fuji detection.
- **`components/`**: presentational only. Feature components (hero, members, ledger, proposals,
  approval ring, celebration) plus a small `ui/` primitive set (button, card, input, badge,
  dialog, tooltip, skeleton).

**Live updates**: reads poll on an interval and every write triggers a refetch on confirmation, so
contributions and approvals from other members appear without a manual refresh. That is what makes
the 3-of-5 ring fill in real time during a live demo.

## 6. Demo signer mode (how the 3-of-5 story works live)

In a live pitch one presenter holds a single wallet, but the threshold story needs distinct member
approvals on-chain. When `NEXT_PUBLIC_DEMO_MNEMONIC` is set, the app derives five member accounts
locally and can submit approvals as members 2 through 5 from one machine, so the full 3-of-5 flow
completes in front of the audience. Every approval is a real Fuji transaction. This is a
testnet-only convenience: the mnemonic ships in the client bundle, so only ever use a throwaway
testnet mnemonic with no real funds.

## 7. Design identity

"Warm East African fintech," distinct from the sibling apps:
- Parchment/cream base with a faint paper grain (a ledger-book texture), deep forest-teal primary,
  confident amber-gold reserved for money, warm near-black ink, and a clay accent.
- A woven dashed rule that nods to kitenge/kanga textile lines, and a soft gold aura behind focal
  elements.
- Bilingual Swahili/English voice (for example "Akiba ya uwazi," "Mwenyekiti" for the chair).

## 8. Configuration

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CHAMA_ADDRESS` | Deployed `ChamaGroup` address (printed by the deploy script). The app shows a setup notice until it is set. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables the WalletConnect QR option (injected wallets like MetaMask work without it). |
| `NEXT_PUBLIC_DEMO_MNEMONIC` | Throwaway testnet mnemonic for demo signer mode (members 2 to 5). |
| `NEXT_PUBLIC_FUJI_RPC_URL` | Optional RPC override (defaults to the public Fuji endpoint). |

## 9. Run it

From the repo root, deploy and seed the contract, then start the dashboard:

```bash
npm run deploy:chama   # prints the ChamaGroup address and the members table
# set NEXT_PUBLIC_CHAMA_ADDRESS in web-chama/.env.local
npm run seed:chama     # makes the first contributions
cd web-chama && npm run dev   # http://localhost:3000
```

Connect a wallet on Fuji (fund it from the Avalanche faucet), and you can contribute, propose, and
approve. With demo signer mode on, the remaining member approvals can be submitted from the same
machine to complete a payout live.

## 10. The demo flow in five beats

1. Members contribute AVAX to the shared pool. Each contribution is an immutable ledger entry.
2. A member proposes a payout (recipient, amount, reason).
3. Members approve. The 3-of-5 ring fills in real time, showing how many more approvals are needed
   and who has signed.
4. On the third approval, the escrow releases funds to the recipient automatically.
5. The UI celebrates and the pooled balance updates, all backed by real Fuji transactions.

---

ChamaChain is one of three apps in the monorepo, alongside MazaoTrace (produce traceability with
escrow) and SkillPass TZ (soulbound credentials). They share the same Hardhat setup and the same
layered frontend patterns, each with its own visual identity.
