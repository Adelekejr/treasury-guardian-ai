# Progress

Working branch: `claude/new-session-o7fjlp`. `main` is what Vercel deploys.

## Implementation order

| # | Step | Status |
|---|------|--------|
| 1 | Scaffold, `.gitignore`, `.env.example`, LICENSE, design tokens | Done |
| 2 | Shared types and deterministic fixtures | Done |
| 3 | Complete interface against fixtures, all 6 screens and all 9 states | Done |
| 4 | Deterministic policy rules, validation, and the test proving AI cannot override them | Done |
| 5 | Hardhat contract and unit tests, local only | Done, 16 tests pass |
| 6 | **Stop before deploying to Arbitrum Sepolia** | **Waiting on you.** See below |
| 7 | viem adapter, polling event reader, receipt verification, wrong-network handling | Done, untested against a live deployment |
| 8 | AI adapter and structured output validation | Done, mock by default and remote optional |
| 9 | Demo Mode fallback wired through every external dependency | Done |
| 10 | Error states and remaining tests | Done, 47 frontend tests and 16 contract tests |
| 11 | README, ARCHITECTURE.md, architecture diagram, deployment instructions | Done |
| 12 | Production build and Vercel deploy config | `vercel.json` written, `npm run build` passes |

## Routes

`/` is the landing page in `src/landing/`. `/app` is the dashboard. One bundle
and one rewrite rule in `vercel.json` serve both, and both deploy from `main`.

## Rounds since the first review

1. **Visual rework (`48c5405`).** Near-black canvas with a surface lift scale,
   quiet provenance marks in place of warning-coloured pills, a 52px header with
   a bottom nav on mobile, risk icons with distinct silhouettes, one collapsible
   status line, and monospace tabular figures for all data.
2. **Landing page (`6af2291`).** Hero, measured stat strip, problem section,
   numbered steps, the enforcement table, and a `RiskAssessment` produced by the
   real engine at render time.
3. **Wallet picker (`95f78d2`).** EIP-6963 discovery, a modal that always opens,
   and the chain guard applied on connect.
4. **Copy edit.** A pass over the landing page, the dashboard, the docs and the
   code comments. No technical claim or number changed. The WalletConnect row
   was removed from the modal, and its catalogue entry stays in
   `src/services/wallet/catalog.ts` for when there is a project id.

## Where I am

Last files worked on were `src/services/wallet/eip6963.ts`, `catalog.ts`,
`walletService.ts` and `src/components/WalletModal.tsx`. Connect opens a wallet
picker built on EIP-6963 discovery. MetaMask, Bitget Wallet and Rabby are always
listed, missing ones carry install links, and the 421614 chain guard applies
after connecting. I checked four scenarios in a headless browser: no wallet, two
announced wallets, a wallet on Ethereum mainnet, and legacy `window.ethereum`
only.

Verified in this session:

- `npm run build` succeeds, `tsc -b` reports zero errors, `eslint .` is clean.
- `npm test` passes 47. `npm run test:contracts` passes 16.
- A headless browser pass over all six screens, the approval gate, every
  simulated state, mobile width with no horizontal overflow, and greyscale.

## Next three actions

1. **The step 6 stop, waiting on you.** Confirm the funded Arbitrum Sepolia
   wallet, the approver address, the recipient allowlist and the transfer limit.
   Nothing is deployed until you do.
2. Deploy `TreasuryGuardian` with those values using
   `npm run deploy:arbitrum-sepolia --workspace @treasury-guardian/contracts`,
   then record the address.
3. Fill in `VITE_GUARDIAN_ADDRESS` and `VITE_TREASURY_ADDRESS`, set
   `VITE_DEMO_MODE=false`, and run the live path end to end: the poller, receipt
   verification and wrong-network handling.

## Known gaps

- Nothing has been deployed, so the viem adapter and the contract service have
  only run against fixtures and a local Hardhat node.
- Approval decisions live in browser session state. There is no persistence
  layer, so a reload clears the history.
