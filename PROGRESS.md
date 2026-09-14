# Progress

Working branch: `claude/new-session-o7fjlp`. Last updated after the first
implementation commit.

## Implementation order — status

| # | Step | Status |
|---|------|--------|
| 1 | Scaffold, `.gitignore`, `.env.example`, LICENSE, design tokens | Done |
| 2 | Shared types and deterministic fixtures | Done |
| 3 | Complete interface against fixtures — all 6 screens, all 9 states | Done |
| 4 | Deterministic policy rules + validation + the test proving AI cannot override them | Done |
| 5 | Hardhat contract + unit tests, local only | Done — 16 tests pass |
| 6 | **STOP before deploying to Arbitrum Sepolia** | **Blocked on you** — see below |
| 7 | viem adapter, polling event reader, receipt verification, wrong-network handling | Done (untested against a live deployment) |
| 8 | AI adapter + structured output validation | Done — mock by default, remote optional |
| 9 | Demo Mode fallback wired through every external dependency | Done |
| 10 | Error states, remaining tests | Done — 41 frontend tests, 16 contract tests |
| 11 | README, ARCHITECTURE.md, architecture diagram, deployment instructions | Done |
| 12 | Production build + Vercel deploy config | `vercel.json` written, `npm run build` passes |

## Routes

`/` is the landing page (`src/landing/`), `/app` is the dashboard. One bundle,
one rewrite rule.

## Where I am

Last files worked on: the visual pass — `src/styles/tokens.css`,
`src/styles/base.css`, `src/components/Icons.tsx`, `StatusStrip.tsx`,
`TopBar.tsx`, `Badges.tsx` and `TreasuryOverview.tsx`. Near-black canvas with a
surface lift scale, real risk icons, one compact status line, a 52px header
with a bottom nav on mobile, quiet provenance marks and a strict
mono-for-data / sans-for-prose rule. All of it is committed, rebuilt and
verified in a headless browser at 390px and 1280px, in colour and greyscale.

Verified in this session:
- `npm run build` succeeds; `tsc -b` reports zero errors; `eslint .` is clean.
- `npm test` — 41 passing. `npm run test:contracts` — 16 passing.
- Headless browser pass over all six screens, the approval gate, every
  simulated state, mobile width (no horizontal overflow) and greyscale.

## Next three actions

1. **Waiting on you — the step 6 stop.** Confirm your funded Arbitrum Sepolia
   wallet, the approver address, the recipient allowlist and the transfer limit.
   Nothing is deployed until you do.
2. Deploy `TreasuryGuardian` with those values
   (`npm run deploy:arbitrum-sepolia --workspace @treasury-guardian/contracts`)
   and record the address.
3. Fill in `VITE_GUARDIAN_ADDRESS` / `VITE_TREASURY_ADDRESS`, set
   `VITE_DEMO_MODE=false`, and re-run the live path end to end — poller,
   receipt verification, wrong-network handling — then deploy the frontend to
   Vercel.

## Known gaps

- No live-network test exists yet: nothing has been deployed, so the viem
  adapter and the contract service have only been exercised against fixtures
  and local Hardhat.
- Approval decisions are held in browser session state; there is no persistence
  layer, so a reload clears the history.
