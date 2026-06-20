# Design: MazaoTrace

Date: 2026-06-20
Status: approved (design), pending spec review
Scope: the third app in the monorepo. A cashew produce traceability system with marketplace
escrow. Standalone contract + frontend, reusing the established monorepo patterns.

## Goals

- Track a cashew batch from farm to market as on-chain events, and hold the buyer's payment in
  escrow that releases to the farmer only when delivery is confirmed (solving the delayed payment
  problem in the same flow as traceability).
- Reuse the five mnemonic-derived wallets as roles: farmer = account 0 (also the deployer and owner),
  transporter = account 1 (allowlisted), buyer = account 2. Accounts 0, 1, 2 are funded on Fuji.
- Student level and cheap: batch price about 0.0004 AVAX.
- A frontend with a third distinct visual identity, separate from ChamaChain and SkillPass.

## Contract: `MazaoTrace.sol`

OpenZeppelin v5 `ReentrancyGuard` (for the payout and refund transfers) + `Ownable` (transporter
allowlist). Compiles under the repo's `evmVersion: cancun`. Batch ids start at 1.

### State machine

`Registered -> Funded -> InTransit -> Delivered`, with `Cancelled` as a terminal branch reachable
only from `Funded`.

```
enum Status { Registered, Funded, InTransit, Delivered, Cancelled }

struct Batch {
    uint256 id;
    address farmer;        // registrant
    string crop;           // for example "Cashew"
    uint256 quantityKg;
    uint256 price;         // wei held in escrow once funded
    address buyer;         // set on purchase
    address transporter;   // set on pickup
    Status status;
    uint64 registeredAt;
    uint64 fundedAt;
    uint64 pickedUpAt;
    uint64 deliveredAt;
}
```

Storage: `mapping(uint256 => Batch) batches`, `uint256 nextId = 1`, `mapping(address => bool) isTransporter`,
`mapping(address => string) transporterName`.

### Functions

- `constructor()`: sets the owner to the deployer (the farmer in the demo). Transporters are added via
  `addTransporter`; the seed adds account 1 as the demo transporter.
- `addTransporter(address transporter, string name)` onlyOwner: extend the transporter allowlist.
- `registerBatch(string crop, uint256 quantityKg, uint256 price)` returns `uint256 id`: open to anyone;
  requires non-empty crop, quantityKg > 0, price > 0. Sets `farmer = msg.sender`, status `Registered`,
  `registeredAt`. Emits `BatchRegistered`.
- `purchase(uint256 id)` payable: requires status `Registered`, `msg.value == price`, and
  `msg.sender != farmer`. Sets `buyer = msg.sender`, status `Funded`, `fundedAt`. The contract now holds
  the escrow. Emits `BatchPurchased`.
- `confirmPickup(uint256 id)` onlyTransporter: requires status `Funded`. Sets `transporter = msg.sender`,
  status `InTransit`, `pickedUpAt`. Emits `BatchPickedUp`.
- `confirmDelivery(uint256 id)` nonReentrant: requires status `InTransit` and `msg.sender == buyer`.
  Sets status `Delivered` and `deliveredAt` (effects), then transfers `price` to the farmer
  (interaction). Emits `BatchDelivered`.
- `cancel(uint256 id)` nonReentrant: requires status `Funded` (before pickup) and
  `msg.sender == buyer || msg.sender == farmer`. Sets status `Cancelled` (effects), then refunds
  `price` to the buyer. Emits `BatchCancelled`.
- Views: `getBatch(id)` (reverts if absent), `getBatches()` returns `Batch[]`, `batchCount()` returns
  `nextId - 1`, plus the public `isTransporter` and `transporterName` getters.

### Security

- `confirmDelivery` and `cancel` are the only functions that send value. Both are `nonReentrant` and
  follow checks-effects-interactions (status flips to a terminal state before the transfer), so a batch
  cannot be released or refunded twice and a reentrant recipient cannot drain the contract.
- Each batch holds exactly its own `price` once `Funded`; status guards prevent acting on a
  `Delivered` or `Cancelled` batch, so the contract never pays out more than it holds for a batch.

### Tests (Hardhat)

- Happy path: register, purchase (escrow held, wrong msg.value reverts), confirmPickup, confirmDelivery
  releases exactly `price` to the farmer (changeEtherBalance), status `Delivered`.
- Cancel: a `Funded` batch can be cancelled by buyer or farmer and refunds the buyer; cancel after
  pickup (`InTransit`) reverts.
- Access control: non-transporter `confirmPickup` reverts; non-buyer `confirmDelivery` reverts;
  non-party `cancel` reverts; `addTransporter` is owner only.
- Guards: cannot purchase a non-`Registered` batch; cannot deliver twice; `msg.sender != farmer` on
  purchase.
- Reentrancy: a malicious farmer contract that reenters on receiving the delivery payout cannot double
  spend (balance drops by exactly `price`, status `Delivered`).

## Frontend: `web-mazao`

Same layered architecture and stack as the other two apps (Next.js App Router, wagmi v2, viem,
RainbowKit, framer-motion, sonner). Fuji only.

### Distinct visual identity

Field-to-market logistics, deliberately unlike ChamaChain (warm teal and gold ledger) and SkillPass
(cool indigo passport): a vivid leaf-green primary with a cashew-amber accent on a bright off-white
base, and a horizontal journey stepper as the signature element. Display type Bricolage Grotesque,
body DM Sans, mono Spline Sans Mono. The route between steps is drawn as a dashed line that fills as
the batch advances.

### Surfaces and routes

- `/` dashboard: a grid of batch cards (crop, quantity, price, a compact stepper, current status) and a
  "Register batch" action (farmer).
- `/batch/[id]`: the full horizontal journey stepper (Registered, Funded, In transit, Delivered), a QR
  code for the batch, the parties (farmer, buyer, transporter), and the role-appropriate action button:
  purchase, confirm pickup, confirm delivery, or cancel. A tasteful "Delivered and paid" moment when the
  escrow releases.

### Demo signer and roles

Reuse the demo-signer pattern: farmer = account 0, transporter = account 1, buyer = account 2, all
derived from `NEXT_PUBLIC_DEMO_MNEMONIC`. The batch page offers "act as" controls so one presenter can
drive register (farmer), purchase (buyer), confirm pickup (transporter), confirm delivery (buyer), and
cancel from one machine. Every action is a real Fuji transaction.

### QR code

Generated client-side with `qrcode.react` (no network call); encodes the batch detail URL so a phone
camera resolves to the batch page. The QR is the traceability and authenticity flavor; the supply-chain
actions are buttons (no real camera scanning in the demo).

### Layers and the token lesson

`lib/` (config, abi, demo signer, QR helper), `hooks/` (useBatches, useBatch, useRegisterBatch,
usePurchase, useConfirmPickup, useConfirmDelivery, useCancel, all via the shared useTxRunner pattern),
`components/` presentational. The app reuses the copied UI primitives, but the plan will remap every
token those primitives reference (the chama names like `cream`, `success`, `gold-bright`, `shadow-gold`)
to the mazao green and amber palette up front, so there is no silent missing-token regression like the
one caught in SkillPass.

## Demo flow

1. Farmer (account 0) registers a cashew batch (for example 50 kg at 0.0004 AVAX). A QR appears.
2. Buyer (account 2) purchases: the price is locked in escrow, status Funded.
3. Transporter (account 1) confirms pickup: status InTransit.
4. Buyer (account 2) confirms delivery: the escrow releases to the farmer, status Delivered, and the UI
   celebrates the payment.
5. Alternative branch: before pickup, cancel refunds the buyer.

## Out of scope (YAGNI)

- Disputes, arbitration, or delivery timeouts and auto-refund.
- Multiple transporters per batch, partial shipments, or partial payments.
- Real camera QR scanning (the QR is display and deep-link only).
- Ratings, reputation, or a token currency other than native AVAX.
