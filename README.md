# Treasury Guardian AI

A safety-focused **Arbitrum Sepolia (testnet)** treasury monitor built for the
Arbitrum Open House 2026 Singapore Buildathon.

It watches a testnet treasury, explains what transactions do, flags suspicious
activity, and prepares actions that a human has to approve explicitly.

**Policy decisions are deterministic and enforced in code. The AI explains them
and cannot override them.** The risk verdict is computed before any model is
called and handed to the model as read-only context. Any verdict-shaped field
in a model response is discarded, which
[`src/services/ai/guard.test.ts`](src/services/ai/guard.test.ts) tests
directly.

> Testnet prototype. Not financial advice. No real funds are ever used.

---

## Network

| | |
|---|---|
| Chain | Arbitrum Sepolia (testnet) |
| Chain id | `421614` (`0x66eee`) |
| Public RPC | `https://sepolia-rollup.arbitrum.io/rpc` |
| Explorer | `https://sepolia.arbiscan.io` |
| Settles to | Ethereum Sepolia |
| Gas token | ETH |

Chain `421614` is the only usable target. Ethereum mainnet (1), Arbitrum One
(42161) and Arbitrum Nova (42170) appear once in the code, in a refusal list,
so the app can name them when it declines to operate on them.

The public Arbitrum RPC has **no WebSocket support**, so there is no
subscription watcher anywhere in this repository. Events are read by polling
`getLogs` on a configurable interval.

---

## Setup

```bash
git clone https://github.com/adelekejr/treasury-guardian-ai
cd treasury-guardian-ai
npm install
cp .env.example .env      # optional: the defaults already run in Demo Mode
npm run dev
```

`npm install && npm run dev` works from a clean clone. With no configuration
the app starts in **Demo Mode**, which runs on deterministic fixtures. It makes
no RPC calls, needs no wallet and broadcasts nothing.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Frontend unit tests (Vitest, 47) |
| `npm run test:contracts` | Hardhat contract tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Lint → typecheck → tests → contract tests → build |

### Environment

Every frontend variable is read from `import.meta.env.VITE_*` and is **bundled
into the browser build**, so treat all of it as public. `.env.example` has the
full list. These are the ones that matter:

| Variable | Meaning |
|---|---|
| `VITE_DEMO_MODE` | `true` (default) runs on fixtures only |
| `VITE_GUARDIAN_ADDRESS` | Deployed `TreasuryGuardian` address; empty ⇒ "contract unavailable" state |
| `VITE_TREASURY_ADDRESS` | Address whose balance is shown (defaults to the contract) |
| `VITE_ALLOWED_RECIPIENTS` | Comma-separated recipient allowlist, mirroring the contract |
| `VITE_ALLOWED_METHODS` | Comma-separated method labels, mirroring the contract |
| `VITE_MAX_TRANSFER_ETH` | Single-transfer limit (default `0.05`) |
| `VITE_POLL_INTERVAL_MS` | `getLogs` polling interval, floor 4000 ms |

Setting `VITE_CHAIN_ID` to anything other than `421614` makes the app refuse to
start, which is deliberate.

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the diagram and the boundaries.

```
src/
  types/       shared domain types (the AI type has no verdict field)
  config/      verified network facts, env config, policy config
  data/        demo.* deterministic fixtures (seeded, fixed clock)
  services/
    policy/    deterministic rule engine, the only producer of a verdict
    ai/        schema, guard, mock adapter, optional remote adapter
    chain/     ChainAdapter boundary, either viem (HTTP polling) or fixtures
    contract/  TreasuryGuardian ABI and propose/approve/execute
    wallet/    EIP-6963 discovery, wallet catalogue, chain guard
    agent/     the visible run, fetch then classify then policy then explain
  components/  reusable UI
  views/       the six screens
contracts/     Solidity source, Hardhat tests, Arbitrum Sepolia deploy script
```

### Routes

| Path | What it is |
|---|---|
| `/` | Landing page, with measured figures, the enforcement table and a live verdict object |
| `/app` | The dashboard. Its own screens route in the hash, e.g. `/app#/history` |

Both are served from one bundle, and the host rewrites every path to
`index.html`. See `vercel.json`.

### Connecting a wallet

Connect always opens a wallet picker. It never guesses which wallet to use.

- Wallets are discovered with **EIP-6963** (`eip6963:requestProvider`), so every
  installed wallet is listed separately instead of fighting over
  `window.ethereum`. That legacy provider is used only if nothing announces
  itself.
- MetaMask, Bitget Wallet and Rabby are always listed. Installed ones are marked
  **Detected** and connect on click, showing the icon the wallet announces.
  Missing ones stay visible as **Not installed** and link to their official
  download page, so the list does not change shape between visits.
- Any other wallet that announces itself is listed as its own row.
- With no wallet at all the dialog still opens and explains what to install.
- WalletConnect is prepared in `src/services/wallet/catalog.ts` but not
  rendered. Enabling it needs a project id this deployment does not have.
- After connecting, the chain guard applies. A wallet on any chain other than
  421614 puts the app in its wrong-network state with a switch request. Another
  chain is never accepted silently.

### Screens

1. **Treasury overview.** Network status, wallet, balance, risk summary, policy status, activity.
2. **Transaction inspection.** Recipient, value, method, timestamp, source, risk reasons, decoded action.
3. **Agent analysis.** The visible steps, the policy checks and the AI explanation side by side.
4. **Approval flow.** The exact action, a testnet warning, the policy result, approve and reject.
5. **Activity history.** A searchable list of analysed events and their outcomes.
6. **Settings and about.** Demo Mode disclosure, contract address, repo link, safety limits, disclaimer.

### States

All nine states are implemented and reachable. They are safe/low, review
required/medium, blocked/high, insufficient data, wallet disconnected, wrong
network, AI unavailable, contract unavailable, and Demo Mode active. The four
that depend on the outside world can be triggered from **Settings → Preview a
state**, which changes the browser session only.

### Risk model

Rules run in code, before any AI call:

| Condition | Verdict |
|---|---|
| Wrong chain | `BLOCKED` |
| Amount over the configured testnet limit | `BLOCKED` |
| Unknown recipient (not on the allowlist) | `REVIEW_REQUIRED` |
| Contract method not on the allowlist | `REVIEW_REQUIRED` |
| Missing transaction data | `INSUFFICIENT_DATA` |
| Allowlisted recipient + allowed method + under limit | `LOW_RISK` |

The most severe failing rule wins. A `BLOCKED` or `INSUFFICIENT_DATA` verdict
makes the approval flow unreachable, and that is enforced in code rather than by
hiding a button.

### AI boundary

- Output must be JSON matching a TypeScript schema. **The schema has no verdict
  field**, so a model cannot express one through the boundary.
- `recommendation` is one of `APPROVE_FOR_REVIEW | REQUIRE_REVIEW | BLOCK`, and
  is labelled advisory everywhere it appears.
- The model has to cite observed fact ids. Citing an id the policy engine never
  produced rejects the whole response.
- Unknown keys a model returns are listed in the UI as discarded, so you can
  see an override attempt rather than having it silently dropped.
- If parsing fails or the provider is unreachable, the app shows "AI
  explanation unavailable" and keeps the deterministic verdict and its evidence
  on screen. The app never blocks on the AI.

---

## Smart contract

[`contracts/contracts/TreasuryGuardian.sol`](contracts/contracts/TreasuryGuardian.sol)
is the smallest contract that demonstrates the boundary.

```
propose(to, value, method, reason) -> id   // reverts: bad recipient, bad method, over limit
approve(id)                                // approver only
reject(id, reason)                         // approver only
execute(id)                                // reverts unless approved; re-checks every limit
receive()                                  // testnet funding
events: ProposalCreated, ProposalApproved, ProposalRejected, ProposalExecuted, Deposit
```

### Safety limits

- One **immutable approver**, set at construction. No setter, no transfer, no backdoor.
- An **immutable recipient allowlist** and **method allowlist**.
- An **immutable maximum single transfer**, checked at proposal *and* at execution.
- **Execution reverts without an explicit prior approval.**
- No `delegatecall`, no arbitrary external calls and no calldata forwarding.
  The only value movement is a native transfer to an allowlisted recipient.
- No token approvals of any kind, so no unlimited allowance is possible.
- No upgradeability, no proxy, no pause, no sweep, no `selfdestruct`.
- No mainnet deploy script exists. The deploy script refuses any chain id other
  than 421614.

All addresses and limits come from `contracts/.env` rather than from hardcoded
values in the Solidity source.

### Tests

```bash
npm run test:contracts
```

16 tests cover a rejected recipient, an over-limit amount, a disallowed method,
execution attempted without approval, successful approved execution, rejection
followed by an attempted execution, double execution, an unfunded guardian, and
an assertion that no owner, pause, upgrade or sweep function exists on the ABI.

> The compiler is pinned to the `solc` npm package (0.8.26) via a Hardhat
> subtask, so tests compile without downloading a binary from
> `binaries.soliditylang.org`. Hardhat's normal download path still applies to
> any other version.

---

## Deployment

### Contract → Arbitrum Sepolia

```bash
cd contracts
cp .env.example .env     # fill in: deployer key, approver, allowlist, limit
npm run deploy:arbitrum-sepolia --workspace @treasury-guardian/contracts
```

`contracts/.env` is the only place a deployer key may live. It is gitignored,
and the key should be a throwaway funded with testnet ETH. The script prints the
`VITE_*` lines to paste into the frontend `.env`.

### Frontend → Vercel

`vercel.json` is committed. It builds with `npm run build`, serves `dist`, and
rewrites every path to `index.html`.

1. Import the repository in Vercel.
2. Add the `VITE_*` environment variables (remember: they are public).
3. Deploy. Leaving `VITE_DEMO_MODE=true` ships the fixture-only demo.

---

## Secrets

- `.gitignore` covers `.env`, `CLAUDE.md` and any keystore, and did so before
  the first commit.
- The deployer private key lives only in `contracts/.env`. It is never read by
  the frontend, never logged, and never printed.
- Anything in `import.meta.env.VITE_*` ships to the browser. Treat all of it as
  public.
- **The AI provider key is entered at runtime and held in memory for the
  browser session only.** It is not written to `localStorage`, it is not
  persisted, and a page reload clears it. Anything running in the page can still
  reach it, which is why the offline mock adapter is the default and the better
  choice for a hosted demo.

---

## Limitations

1. Testnet only. There is no mainnet, Arbitrum One or Arbitrum Nova code path.
2. Event history covers the polling window rather than full chain history.
   There is no indexer.
3. The AI explanation is advisory. The app is fully usable without it.
4. Approvals are held in browser session state and are not persisted.
5. Demo Mode fixtures are synthetic and labelled on every row they appear in.
   They are not read from the chain and carry no real transaction hashes.
6. The live adapter and contract service have been exercised against fixtures
   and a local Hardhat node. Neither has been run against a deployed contract.

## Safety

- No real funds, ever. No private key is requested, stored, printed, logged or
  committed.
- There is no unrestricted autonomous execution. Every proposed action shows
  the exact recipient, value, chain, method, decoded calldata summary and
  reason, and needs an explicit human approval.
- No RPC endpoint, contract address, ABI method, event signature or chain id in
  this repository was invented.
- A transaction hash is only ever shown when it came from a real receipt. In
  Demo Mode the app states plainly that nothing was broadcast.
- Risk is expressed through text, label, icon silhouette **and** colour. The
  four verdicts use a filled octagon, an outlined triangle, a dashed circle and
  a shield, so the screens survive a greyscale test.
- Provenance appears on every event as quiet monospace text. It records where
  the data came from, so it is not styled as a warning.

## Licence

MIT. See [LICENSE](LICENSE).
