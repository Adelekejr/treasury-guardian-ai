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
| 11 | README, ARCHITECTURE.md, architecture diagram, deployment instructions | **Not started** |
| 12 | Production build + Vercel deploy config | `vercel.json` written, `npm run build` passes |

## Where I am

Last file worked on: `src/components/EventTable.tsx` and `src/styles/base.css` —
adding the mobile card layout (wide tables collapse to record cards below
720px) and a foreign-chain warning on any event that is not on chain 421614.
That change is committed, rebuilt and verified in a headless browser.

Verified in this session:
- `npm run build` succeeds; `tsc -b` reports zero errors; `eslint .` is clean.
- `npm test` — 41 passing. `npm run test:contracts` — 16 passing.
- Headless browser pass over all six screens, the approval gate, every
  simulated state, mobile width (no horizontal overflow) and greyscale.

## Next three actions

1. Write `README.md` (setup, architecture, contract safety limits, deployment,
   limitations, safety, and the plain statement that a browser-held AI key is
   session-only) and `ARCHITECTURE.md` with the data-flow diagram.
2. Push the branch and hand over the deploy checkpoint: I need you to confirm
   your funded Arbitrum Sepolia wallet address, the approver address and the
   recipient allowlist before anything is deployed (step 6 — I will not deploy
   until you confirm).
3. After you confirm and the contract is deployed, fill in
   `VITE_GUARDIAN_ADDRESS` / `VITE_TREASURY_ADDRESS`, flip `VITE_DEMO_MODE` to
   `false`, and re-run the live path end to end (poller, receipt verification,
   wrong-network handling) against the deployed address.

## Known gaps

- No live-network test exists yet: nothing has been deployed, so the viem
  adapter and the contract service have only been exercised against fixtures
  and local Hardhat.
- Approval decisions are held in browser session state; there is no persistence
  layer, so a reload clears the history.
