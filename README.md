# Treasury Guardian AI

A safety-focused **Arbitrum Sepolia (testnet)** treasury monitor built for the
Arbitrum Open House 2026 Singapore Buildathon.

It watches a testnet treasury, explains what transactions do, flags suspicious
activity, and prepares actions that a human must explicitly approve.

**The core idea: policy decisions are deterministic and enforced in code. The
AI explains them and cannot override them.** The risk verdict is computed
before any model is called, is handed to the model as read-only context, and
any verdict-shaped field in a model response is discarded — a property covered
by [`src/services/ai/guard.test.ts`](src/services/ai/guard.test.ts).

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
(42161) and Arbitrum Nova (42170) are named in the code exactly once — in a
refusal list — so the app can tell you it will not operate on them.

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

`npm install && npm run dev` works from a clean clone. With no configuration at
all the app starts in **Demo Mode**: deterministic fixtures, no RPC calls, no
wallet needed, nothing broadcast.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Frontend unit tests (Vitest) |
| `npm run test:contracts` | Hardhat contract tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Lint → typecheck → tests → contract tests → build |

### Environment

Every frontend variable is read from `import.meta.env.VITE_*` and is **bundled
into the browser build**. Treat all of it as public. See `.env.example` for the
full list; the ones that matter:

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
start. That is deliberate.

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the diagram and the boundaries.

```
src/
  types/       shared domain types (the AI type has no verdict field)
  config/      verified network facts, env config, policy config
  data/        demo.* deterministic fixtures (seeded, fixed clock)
  services/
    policy/    deterministic rule engine — the only producer of a verdict
    ai/        schema, guard, mock adapter, optional remote adapter
    chain/     ChainAdapter boundary: viem (HTTP polling) or demo fixtures
    contract/  TreasuryGuardian ABI and propose/approve/execute
    wallet/    EIP-1193 connect, chain guard, switch request
    agent/     the visible run: fetch → classify → policy → explain
  components/  reusable UI
  views/       the six screens
contracts/     Solidity source, Hardhat tests, Arbitrum Sepolia deploy script
```

### Routes

| Path | What it is |
|---|---|
| `/` | Landing page — the claim, measured figures, the enforcement table and a live verdict object |
| `/app` | The dashboard. Its own screens route in the hash, e.g. `/app#/history` |

Both are served from one bundle; the host rewrites every path to `index.html`
(see `vercel.json`).

### Screens

1. **Treasury overview** — network status, wallet, balance, risk summary, policy status, activity.
2. **Transaction inspection** — recipient, value, method, timestamp, source, risk reasons, decoded action.
3. **Agent analysis** — the visible steps, the policy checks, and the AI explanation side by side.
4. **Approval flow** — the exact action, a testnet warning, the policy result, approve and reject.
5. **Activity history** — searchable list of analysed events and their outcomes.
6. **Settings and about** — Demo Mode disclosure, contract address, repo link, safety limits, disclaimer.

### States

All nine are implemented and reachable: safe/low, review required/medium,
blocked/high, insufficient data, wallet disconnected, wrong network, AI
unavailable, contract unavailable, and Demo Mode active. The four that depend
on the outside world can be triggered from **Settings → Preview a state**, which
changes the browser session only.

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
makes the approval flow unreachable — enforced in code, not by hiding a button.

### AI boundary

- Output must be JSON matching a TypeScript schema. **The schema has no verdict
  field**, so a model cannot express one through the boundary.
- `recommendation` is one of `APPROVE_FOR_REVIEW | REQUIRE_REVIEW | BLOCK`, and
  is labelled advisory everywhere it appears.
- The model must cite observed fact ids; citing an id the policy engine never
  produced rejects the whole response.
- Unknown keys a model returns are listed in the UI as discarded, so you can
  see an override attempt rather than having it silently dropped.
- If parsing fails or the provider is unreachable, the app shows "AI
  explanation unavailable" with the deterministic verdict and evidence intact.
  The app never blocks on the AI.

---

## Smart contract

[`contracts/contracts/TreasuryGuardian.sol`](contracts/contracts/TreasuryGuardian.sol)
is the smallest thing that demonstrates the boundary.

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
- No `delegatecall`, no arbitrary external calls, no calldata forwarding — the
  only value movement is a native transfer to an allowlisted recipient.
- No token approvals of any kind, so no unlimited allowance is possible.
- No upgradeability, no proxy, no pause, no sweep, no `selfdestruct`.
- No mainnet deploy script exists. The deploy script refuses any chain id other
  than 421614.

All addresses and limits come from `contracts/.env`, never from hardcoded
values in the Solidity source.

### Tests

```bash
npm run test:contracts
```

16 tests, covering a rejected recipient, an over-limit amount, a disallowed
method, execution attempted without approval, successful approved execution,
rejection then attempted execution, double execution, an unfunded guardian, and
an assertion that no owner/pause/upgrade/sweep function exists on the ABI.

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

`contracts/.env` is the **only** place a deployer key may live, it is
gitignored, and it must be a throwaway testnet key. The script prints the
`VITE_*` lines to paste into the frontend `.env`.

### Frontend → Vercel

`vercel.json` is committed: build `npm run build`, output `dist`, SPA rewrite.

1. Import the repository in Vercel.
2. Add the `VITE_*` environment variables (remember: they are public).
3. Deploy. To ship the fixture-only demo, leave `VITE_DEMO_MODE=true`.

---

## Secrets

- `.gitignore` covers `.env`, `CLAUDE.md` and any keystore, and did so before
  the first commit.
- The deployer private key lives only in `contracts/.env`. It is never read by
  the frontend, never logged, and never printed.
- Anything in `import.meta.env.VITE_*` ships to the browser. Treat all of it as
  public.
- **The AI provider key is entered at runtime and held in memory for the
  browser session only.** It is not written to `localStorage`, not persisted,
  and cleared by a page reload. It is still exposed to anything running in the
  page, which is why the offline mock adapter is the default and the honest
  recommendation for a hosted demo.

---

## Limitations

1. Testnet only. There is no mainnet, Arbitrum One or Arbitrum Nova code path.
2. Event history covers the polling window, not full chain history — there is
   no indexer.
3. The AI explanation is advisory; the app is fully usable without it.
4. Approvals are held in browser session state and are not persisted.
5. Demo Mode fixtures are synthetic and are labelled as such on every row they
   appear in — they are not read from the chain, and they carry no real hashes.
6. The live adapter and contract service have been exercised against fixtures
   and a local Hardhat node; they have not yet been run against a deployed
   contract.

## Safety

- No real funds, ever. No private key is requested, stored, printed, logged or
  committed.
- No unrestricted autonomous execution: every proposed action shows the exact
  recipient, value, chain, method, decoded calldata summary and reason, and
  requires an explicit human approval.
- No RPC endpoint, contract address, ABI method, event signature or chain id in
  this repository was invented.
- A transaction hash is only ever shown when it came from a real receipt. In
  Demo Mode the app states plainly that nothing was broadcast.
- Risk is expressed through text, label, icon silhouette **and** colour — the
  four verdicts use a filled octagon, an outlined triangle, a dashed circle and
  a shield, so the screens survive a greyscale test.
- Provenance is shown on every event, as quiet monospace text rather than a
  warning-coloured pill: it is a fact about the data source, not an alert.

## Licence

MIT — see [LICENSE](LICENSE).
