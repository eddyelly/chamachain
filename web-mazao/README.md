# MazaoTrace (web-mazao)

A cashew produce traceability system with marketplace escrow on the Avalanche Fuji testnet.
Farmers register batches, transporters move them from farm to market, and buyers purchase with the
payment locked on-chain until delivery is confirmed. `web-mazao` is the Next.js dashboard: a
horizontal journey stepper, per-batch QR codes, and one-click actions that drive a real escrow
state machine. Every step is an on-chain event.

This README documents what the app does, how it is built, and the full stack, so it can be lifted
straight into a deck.

**Live demo:** https://mazaotrace.vercel.app

---

## 1. What it is (the elevator pitch)

- "Mazao" means produce/crops. The problem: a buyer paying a smallholder farmer up front has no
  guarantee of delivery, and a farmer shipping first has no guarantee of payment.
- MazaoTrace puts the payment in **on-chain escrow** and tracks the batch from farm to market.
  The buyer's money is locked when they purchase, and it releases to the farmer only when the
  buyer confirms delivery. Cancelling before pickup refunds the buyer.
- Each batch is a public, traceable record with its own QR code, so anyone can scan and follow its
  journey.

## 2. The on-chain model (`MazaoTrace.sol`)

A single Solidity contract (Solidity `^0.8.24`, OpenZeppelin v5 `Ownable` + `ReentrancyGuard`) is
the source of truth. The frontend only reads and writes to it.

**The escrow state machine**: a batch moves `Registered` -> `Funded` -> `InTransit` -> `Delivered`,
with `Cancelled` as the terminal alternative.

**Actions**
- `registerBatch(crop, quantityKg, price)`: a farmer lists a batch. Batch ids start at 1.
- `purchase(id)` (payable): a buyer locks exactly the batch price in escrow. The batch becomes
  `Funded`. The farmer cannot buy their own batch, and the payment must match the price.
- `confirmPickup(id)` (allowlisted transporters only): the batch becomes `InTransit`.
- `confirmDelivery(id)` (buyer only, `nonReentrant`): releases the escrow to the farmer and marks
  the batch `Delivered`.
- `cancel(id)` (buyer or farmer, before pickup, `nonReentrant`): refunds the buyer and marks the
  batch `Cancelled`.
- `addTransporter(address, name)` (owner only): manages the transporter allowlist.

**Safety**
- The value-moving functions (`confirmDelivery`, `cancel`) are `nonReentrant` and follow
  checks-effects-interactions: the terminal status is written before the transfer, blocking
  reentrancy and double spend.
- Role checks on every transition (owner, allowlisted transporter, buyer, farmer).

**Events** (the live story the UI listens to): `TransporterAdded`, `BatchRegistered`,
`BatchPurchased`, `BatchPickedUp`, `BatchDelivered`, `BatchCancelled`.

**Read views**: `getBatch`, `getBatches`, `batchCount`, plus the transporter allowlist.

## 3. Roles

- **Farmer** (demo account 0, the deployer/owner): registers batches, receives the escrow on
  delivery.
- **Transporter** (demo account 1, allowlisted during seed): confirms pickup.
- **Buyer** (demo account 2): purchases (locking escrow), confirms delivery, or cancels before
  pickup.

## 4. Features (what is on the screen)

- **Batch dashboard** (`/`): a grid of batch cards showing crop, quantity, price, and current
  status, each with a compact journey stepper.
- **Journey stepper**: a horizontal Registered -> Funded -> In transit -> Delivered progression
  that fills as on-chain events land (with a distinct cancelled state).
- **Batch detail** (`/batch/[id]`): the full journey, batch facts, and the action panel.
- **Per-batch QR code**: each batch has a QR linking to its detail page, for scan-to-trace.
- **Role-aware actions**: register, purchase, confirm pickup, confirm delivery, and cancel, each
  enabled only at the right status and signed by the correct role.
- **Delivery celebration**: a moment of delight when the escrow releases on confirmed delivery.
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
- framer-motion for animation, sonner for toast lifecycle, lucide-react for icons.
- **qrcode.react** for the per-batch QR codes.
- Radix UI primitives (dialog, tooltip, label, slot), class-variance-authority + clsx +
  tailwind-merge.
- Fonts: Bricolage Grotesque (display), DM Sans (body), Spline Sans Mono (numbers and addresses).

**Contracts and tooling** (repo root, shared across apps)
- Hardhat 3, Solidity 0.8.24, OpenZeppelin v5.
- 14 Hardhat tests covering the state machine, escrow accounting, access control, and reentrancy.
- Deploy and seed scripts for Fuji (`npm run deploy:mazao`, `npm run seed:mazao`).

## 6. Branding (leaf green + cashew amber)

A "field-to-market logistics" identity: vivid leaf green and cashew amber on a bright off-white
base. Deliberately distinct from ChamaChain (warm teal/gold) and SkillPass (cool indigo). Theme
color `#1f7a3d`.

| Role | Token | Hex |
| --- | --- | --- |
| Primary (leaf green) | `--color-primary` | `#1f7a3d` |
| Primary deep | `--color-primary-deep` | `#155e2e` |
| Primary bright | `--color-primary-bright` | `#2c9d54` |
| Primary tint | `--color-primary-tint` | `#d8ecdd` |
| Gold (cashew amber) | `--color-gold` | `#bf6a1a` |
| Gold bright | `--color-gold-bright` | `#e89432` |
| Gold tint | `--color-gold-tint` | `#f7e6cf` |
| Clay accent | `--color-clay` | `#b4521f` |
| Base / surface | `--color-cream` / `--color-surface` | `#f5faf3` / `#ffffff` |
| Ink | `--color-ink` | `#15241a` |
| Success / danger | `--color-success` / `--color-danger` | `#1f9d57` / `#c0392b` |

Signature touch: a dashed "route line" between journey steps, echoing a delivery route on a map.

## 7. Architecture (clean layering)

The app follows a strict three-layer rule so components never touch the chain directly.

- **`lib/`**: configuration and clients. `mazao/config.ts` (address + Fuji + Snowtrace helpers),
  `mazao/abi.ts` (generated ABI), `mazao/contract.ts`, `mazao/types.ts` (`Batch`, `STATUS_LABELS`),
  `mazao/demo.ts` (demo signer roles), plus `wagmi.ts`, `format.ts`, `errors.ts`, `utils.ts`.
- **`hooks/`**: all chain reads and writes. `useBatches`/`useBatch` poll the contract (gated on a
  configured address); `useBatchActions` exposes `register`, `purchase`, `pickup`, `deliver`, and
  `cancel`, each routed through `useTxRunner` for a consistent submitted -> pending -> confirmed
  toast lifecycle and signed by the correct demo role; `useNetwork` handles connection and Fuji
  detection.
- **`components/`**: presentational only. Feature components (stepper, batch card, QR, register
  dialog, actions, celebration) plus a small `ui/` primitive set.

## 8. Demo signer mode

For a live pitch, the app derives the farmer, transporter, and buyer accounts from
`NEXT_PUBLIC_DEMO_MNEMONIC` and signs each action as the correct role from one machine, so the full
farm-to-market flow completes in front of an audience. Every action is a real Fuji transaction.
This is testnet-only: the mnemonic ships in the client bundle, so use only a throwaway testnet
mnemonic with no real funds.

## 9. Configuration

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_MAZAO_ADDRESS` | Deployed `MazaoTrace` address (printed by the deploy script). The app shows a setup notice until it is set. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables the WalletConnect QR option (injected wallets like MetaMask work without it). |
| `NEXT_PUBLIC_DEMO_MNEMONIC` | Throwaway testnet mnemonic for demo signer mode (farmer, transporter, buyer). |
| `NEXT_PUBLIC_FUJI_RPC_URL` | Optional RPC override (defaults to the public Fuji endpoint). |

## 10. Run it

From the repo root, deploy and seed the contract, then start the dashboard:

```bash
npm run deploy:mazao   # prints the MazaoTrace address
# set NEXT_PUBLIC_MAZAO_ADDRESS in web-mazao/.env.local
npm run seed:mazao     # adds the transporter and registers demo batches
cd web-mazao && npm run dev   # http://localhost:3000
```

## The demo flow in five beats

1. A farmer registers a cashew batch (crop, quantity, price).
2. A buyer purchases it, locking the payment in escrow. The batch turns `Funded`.
3. The transporter confirms pickup. The batch turns `In transit`.
4. The buyer confirms delivery. The escrow releases to the farmer and the batch turns `Delivered`.
5. The stepper fills, the UI celebrates, and the QR-traceable record is complete. A cancel before
   pickup would instead refund the buyer.

---

MazaoTrace is one of three apps in the monorepo, alongside ChamaChain (m-of-n savings escrow) and
SkillPass TZ (soulbound credentials). They share the same Hardhat setup and the same layered
frontend patterns, each with its own visual identity.
