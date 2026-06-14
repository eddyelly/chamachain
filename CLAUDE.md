# ChamaChain

Transparent on-chain savings group (chama / kikoba) with m-of-n escrow, deployed to
Avalanche Fuji. Member contributions are recorded immutably on-chain; payouts release
only when a threshold of members (default 3 of 5) approves.

## Repo layout

- `contracts/` Solidity sources (`ChamaGroup.sol`)
- `test/` Hardhat tests (mocha + ethers)
- `scripts/` deploy and seed scripts (Fuji)
- `hardhat.config.ts` Hardhat 3, Solidity 0.8.24, Fuji network
- `web/` Next.js frontend (App Router, wagmi/viem/RainbowKit)

## House rules (apply everywhere: code, comments, copy, docs)

- No em dashes anywhere. Use commas, colons, or parentheses.
- Strict TypeScript. No `any`. Prefer precise types and inferred returns where clear.
- Comment only non-obvious intent, never restate what the code plainly says.
- Frontend layering: `lib/` (config, abi, clients), `hooks/` (all chain reads and writes),
  `components/` (presentational only). Components never embed raw contract calls inline.
- Conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`), each scoped and meaningful.
- Secrets live in `.env` (gitignored). `.env.example` documents every variable.

## Chain

- Avalanche Fuji testnet, chain ID 43113.
- RPC: https://api.avax-test.network/ext/bc/C/rpc
- Explorer: https://testnet.snowtrace.io
- Faucet: https://faucet.avax.network/

## Demo design decisions

- Single deployable `ChamaGroup` (no factory) for the demo.
- Approvals auto-execute the payout the moment the threshold is reached (inside `approvePayout`),
  so the third approval is the release moment in the live story.
- Demo signer mode: five member accounts are derived from `DEMO_MNEMONIC` (indexes 0..4).
  Account 0 is the connected presenter wallet and the chair (Mwenyekiti). The frontend can
  submit approvals from members 2..5 using their local keys so the 3-of-5 flow completes live
  from one machine. All approvals are real on-chain transactions.
