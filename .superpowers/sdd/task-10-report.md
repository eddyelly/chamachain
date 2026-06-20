# Task 10 Report: web-mazao .env.example and README

## .env.example created

`web-mazao/.env.example` contains exactly the four lines from the brief:

```
NEXT_PUBLIC_MAZAO_ADDRESS=0xyour_deployed_mazaotrace_address
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_DEMO_MNEMONIC="your throwaway twelve word testnet mnemonic here"
NEXT_PUBLIC_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

The file required `git add -f` because `web-mazao/.gitignore` has `.env*`. This matches how `web-skillpass/.env.example` is handled (it is also force-tracked).

## README changes

**Bullet change (line 16):**
Before: `**MazaoTrace** (planned) - A produce traceability system with escrow and multi-party consensus.`
After: `**MazaoTrace** (frontend in \`web-mazao/\`) - A cashew produce traceability system with marketplace escrow, tracking batches from farm to buyer on Fuji.`

**New section added** (inserted before "## The demo flow (ChamaChain)"):

`## MazaoTrace` with:
- One-paragraph intro covering the escrow lifecycle and QR note
- `### Roles` (farmer = account 0, transporter = account 1 added during seed, buyer = account 2)
- `### Escrow flow` (purchase locks, confirmDelivery releases, cancel refunds)
- `### Deploy and seed` with `npm run deploy:mazao`, instruction to set `NEXT_PUBLIC_MAZAO_ADDRESS`, and `npm run seed:mazao`
- `### Run the frontend` with `cd web-mazao && npm run dev`

All existing README content (ChamaChain, SkillPass, demo flow, tech stack, etc.) preserved intact.

## Em-dash check

`grep -n "—" README.md web-mazao/.env.example` returned no output. Zero em dashes in either file.

## Files committed

- `web-mazao/.env.example` (created, force-added past gitignore)
- `README.md` (modified)

Commit: `701a0f9 docs: MazaoTrace setup and run steps`

## Self-review findings

- `.env.example` matches the brief exactly (four lines, exact formatting).
- MazaoTrace bullet updated, new section structure mirrors SkillPass TZ section voice and structure.
- Commands documented accurately: `npm run deploy:mazao`, `npm run seed:mazao`, `cd web-mazao && npm run dev`.
- Zero em dashes confirmed.
- Roles accurate: farmer = 0, transporter = 1 (added during seed), buyer = 2.
- Escrow flow: purchase locks, confirmDelivery releases, cancel refunds.
- Live Fuji deploy not run; commands documented only.

## Concerns

- `web-mazao/.env.example` needed force-add (`git add -f`) due to `.env*` pattern in `web-mazao/.gitignore`. This is the same approach used for `web-skillpass/.env.example` and is an accepted monorepo decision.
- The `cd web-mazao && npm run dev` command in the README notes `http://localhost:3001`. The brief did not specify a port; 3001 is the most likely next port given web-chama uses 3000. If the actual port differs, the user should update accordingly.

## Task 10 fix

Port correction applied to README.md line 80.

**Change:** `cd web-mazao && npm run dev    # http://localhost:3001` → `cd web-mazao && npm run dev    # http://localhost:3000`

**Rationale:** The dev script is plain `next dev` which defaults to port 3000, matching how the sibling apps (web-chama, web-skillpass) document the same command. No em dashes introduced.

**Verification:**
- `grep -n "localhost:3001" README.md` returns nothing (confirmed 3001 removed).
- `grep -n "cd web-mazao && npm run dev" README.md` shows line 80 ending in `# http://localhost:3000` (confirmed 3000 in place).

**Commit:** `e7d09e6 fix(docs): correct web-mazao dev server port to 3000`
