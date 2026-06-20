# ChamaChain

A transparent digital savings group (chama / kikoba) on the Avalanche Fuji testnet. Member
contributions are recorded immutably on-chain as a public ledger, and group payouts are held in
escrow that releases only when an m-of-n threshold of members approves (default 3 of 5).

The design goal is trust: the on-chain ledger is the visual hero, money moves transparently
among people who know each other, and every step is verifiable on Snowtrace.

## Projects

This is a monorepo containing three applications:

- **ChamaChain** (frontend in `web-chama/`) - A transparent m-of-n savings group with on-chain escrow.
- **SkillPass TZ** (frontend in `web-skillpass/`) - A soulbound certificate verifier and skill passport, issuing tamper-proof credentials.
- **MazaoTrace** (frontend in `web-mazao/`) - A cashew produce traceability system with marketplace escrow, tracking batches from farm to buyer on Fuji.

## What is in the box

- `contracts/ChamaGroup.sol` the savings group contract (membership, contribution ledger, m-of-n escrow)
- `test/ChamaGroup.test.ts` 24 Hardhat tests covering the ledger, access control, threshold logic, and reentrancy
- `scripts/chama/deploy.ts` and `scripts/chama/seed.ts` deploy to Fuji and seed a believable demo group
- `web-chama/` the Next.js dashboard (wagmi, viem, RainbowKit), styled as warm East African fintech

## SkillPass TZ

SkillPass is a soulbound certificate verifier and skill passport on Avalanche Fuji. Institutions issue tamper-proof credentials (hashed on-chain, file stored off-chain), and anyone can verify authenticity.

### Deploy and seed

```bash
npm run deploy:skillpass    # prints address, writes deployments/skillpass-43113.json
# set NEXT_PUBLIC_SKILLPASS_ADDRESS in web-skillpass/.env.local (+ NEXT_PUBLIC_DEMO_MNEMONIC)
npm run seed:skillpass      # issues 2 sample credentials
```

### Run the frontend

```bash
cd web-skillpass && npm run dev    # http://localhost:3000
```

### Roles

- **Issuer** (account 0 from DEMO_MNEMONIC) issues credentials to students, and can revoke them.
- **Students** (accounts 1 and 2 from DEMO_MNEMONIC) hold their credentials as soulbound (non-transferable) NFTs.
- **Verifier** (anyone) can verify a credential by its id or wallet, or by re-uploading the file to match its on-chain hash.

### Technical notes

The certificate file is hashed in the browser using SHA-256; only the hash is stored on-chain, and the file stays off-chain for privacy and storage efficiency.

## MazaoTrace

MazaoTrace is a cashew produce traceability system on Avalanche Fuji. Farmers register batches, transporters move them from farm to market, and buyers purchase with escrow: payment is locked on-chain until the buyer confirms delivery, at which point it releases to the farmer. A cancel before pickup refunds the buyer. Every step (register, purchase, pickup, deliver, cancel) is an on-chain event, and each batch has a per-batch QR code linking to its detail page on the frontend.

### Roles

- **Farmer** (account 0, deployer/owner) registers batches and receives payment on confirmed delivery.
- **Transporter** (account 1, added during seed) is allowlisted by the farmer and confirms pickup.
- **Buyer** (account 2) purchases a batch (locking escrow), confirms delivery, or cancels before pickup.

### Escrow flow

1. `purchase` (buyer) locks the buyer's payment in escrow.
2. `confirmDelivery` (buyer) releases the escrowed payment to the farmer.
3. `cancel` (before pickup) refunds the buyer and returns the batch to registered status.

### Deploy and seed

```bash
npm run deploy:mazao    # prints MazaoTrace address, writes deployments/mazao-43113.json
# set NEXT_PUBLIC_MAZAO_ADDRESS in web-mazao/.env.local (copy from web-mazao/.env.example)
npm run seed:mazao      # registers a sample batch, adds transporter, seeds a purchase
```

### Run the frontend

```bash
cd web-mazao && npm run dev    # http://localhost:3001
```

## The demo flow (ChamaChain)

1. Open the app. It loads the group dashboard with the existing members and a populated ledger, and shows it is on Fuji.
2. A member contributes test AVAX. The ledger updates publicly and the pooled balance rises, with a "verified on-chain" treatment.
3. A member proposes a payout to another member.
4. Members approve. A 3-of-5 ring fills in real time, showing how many more approvals are needed and who has signed.
5. On the third approval the escrow releases funds to the recipient. The UI celebrates and the balance updates.

## Tech stack

- Contracts: Hardhat 3, Solidity 0.8.24, OpenZeppelin (ReentrancyGuard)
- Chain: Avalanche Fuji, chain ID 43113, RPC `https://api.avax-test.network/ext/bc/C/rpc`
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn-style UI, wagmi + viem, RainbowKit, framer-motion, lucide-react, sonner

## Prerequisites

- Node.js 22+ (Hardhat 3 requires it)
- A wallet (for example MetaMask) for the live demo
- Test AVAX on Fuji from the faucet: https://faucet.avax.network/ (select Fuji C-Chain)

## 1. Install and test the contracts

```bash
# from the repo root
npm install
npm run compile      # Compiled ... with solc 0.8.24
npm test             # 24 passing
```

## 2. Configure the environment

```bash
cp .env.example .env
```

Edit `.env`:

- `PRIVATE_KEY` the deployer key. It must be account index 0 of `DEMO_MNEMONIC` so the deployer is also member 1 (the chair, Mwenyekiti).
- `DEMO_MNEMONIC` a throwaway 12-word mnemonic. The five member accounts are derived from it at indexes 0 to 4. Never use a mnemonic that holds real funds.
- `FUJI_RPC_URL` optional override of the public Fuji RPC.

Fund the deployer address with test AVAX from the faucet before deploying. To seed contributions
from more than one member (a richer ledger), also fund member indexes 1 and 2.

## 3. Deploy and seed on Fuji

```bash
npm run deploy:chama   # prints the ChamaGroup address and the members table
npm run seed:chama     # makes the first contributions (skips any unfunded member)
```

`deploy:chama` writes `deployments/43113.json` with the address and members. Copy the printed
address into the frontend in the next step.

## 4. Run the frontend

```bash
cd web-chama
npm install
cp .env.example .env.local
```

Edit `web-chama/.env.local`:

- `NEXT_PUBLIC_CHAMA_ADDRESS` the address printed by `npm run deploy:chama`.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` a free project id from https://cloud.reown.com (optional; injected wallets such as MetaMask work without it).
- `NEXT_PUBLIC_DEMO_MNEMONIC` the same throwaway mnemonic used for the contract seed (see "Demo signer mode" below).
- `NEXT_PUBLIC_FUJI_RPC_URL` optional RPC override.

Then run the dev server:

```bash
npm run dev          # http://localhost:3000
```

Connect your wallet (the chair / member 0), confirm the app shows Fuji, and walk the demo flow.

## Demo signer mode

The 3-of-5 story needs three distinct member approvals on-chain, but a presenter usually holds one
wallet. When `NEXT_PUBLIC_DEMO_MNEMONIC` is set, the app can submit approvals as members 2 to 5
using locally derived keys, so the full flow completes live from one machine. Every approval is a
real Fuji transaction. The connected wallet still approves as itself (member 1).

This is a testnet-only convenience. The mnemonic ships in the client bundle, so use only a
throwaway mnemonic with no real funds. Fund the member accounts you intend to approve with a little
test AVAX for gas.

## Contract design notes

- A single deployable `ChamaGroup` (no factory) is enough for the demo.
- `contribute()` is payable and restricted to members; each call appends an immutable ledger entry (contributor, amount, timestamp, index) and updates that member's running total.
- `proposePayout(recipient, amount, reason)` is members only and cannot exceed the pooled balance.
- `approvePayout(proposalId)` records one approval per member and auto-executes the payout the moment approvals reach the threshold, so the threshold-th approval is the release moment.
- Reentrancy is blocked by OpenZeppelin `ReentrancyGuard`, an `executed` flag, and checks-effects-interactions. Plain transfers are rejected so the pooled balance always equals the sum of recorded contributions.

## Useful links

- Faucet: https://faucet.avax.network/
- Explorer: https://testnet.snowtrace.io
- Fuji RPC: https://api.avax-test.network/ext/bc/C/rpc

## Troubleshooting

- "Imeshindwa kupakia data" on the dashboard: confirm `NEXT_PUBLIC_CHAMA_ADDRESS` is the address you deployed and that it exists on Fuji.
- Contribute is disabled: the connected account must be a member and on Fuji. The chair (member 0) is funded by you; other members are derived from the mnemonic.
- A demo "Kubali kama ..." approval fails: that member account needs a little test AVAX for gas.
