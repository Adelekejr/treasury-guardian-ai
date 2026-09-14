/** Screen 6 — Settings and about. Disclosure, limits, and the state preview. */
import { useState } from 'react';
import { ARBITRUM_SEPOLIA, FORBIDDEN_CHAINS, explorerAddressUrl } from '../config/network';
import { formatEthWithUnit } from '../lib/format';
import { Notice } from '../components/Notice';
import { StatusStrip } from '../components/StatusStrip';
import { useApp } from '../state/useApp';
import type { SimulatedState } from '../state/appContext';

const SIMULATIONS: readonly { readonly id: SimulatedState; readonly label: string }[] = [
  { id: 'NONE', label: 'Normal' },
  { id: 'WALLET_DISCONNECTED', label: 'Wallet disconnected' },
  { id: 'WRONG_NETWORK', label: 'Wrong network' },
  { id: 'RPC_UNREACHABLE', label: 'RPC outage' },
  { id: 'AI_UNAVAILABLE', label: 'AI unavailable' },
  { id: 'CONTRACT_UNAVAILABLE', label: 'Contract unavailable' },
];

export function SettingsAbout(): React.JSX.Element {
  const {
    config,
    policy,
    demoActive,
    demoReason,
    snapshot,
    aiName,
    aiReason,
    aiKeySet,
    setAiKey,
    simulated,
    setSimulated,
    adapterLabel,
  } = useApp();

  const [keyDraft, setKeyDraft] = useState('');

  return (
    <div className="stack stack--lg">
      <StatusStrip />

      <div>
        <h1>Settings and about</h1>
        <p className="muted small">
          What this app is, what it will not do, and how to reach every state on a phone.
        </p>
      </div>

      <Notice tone="warning" title="Testnet prototype. Not financial advice.">
        Treasury Guardian AI runs on {ARBITRUM_SEPOLIA.name} (chain {ARBITRUM_SEPOLIA.id}) only. It
        never uses real funds, never holds a private key, and every action needs an explicit human
        approval. Chains it will never target: {[...FORBIDDEN_CHAINS.values()].join(', ')}.
      </Notice>

      <section className="card stack" aria-label="Demo Mode disclosure">
        <h2>Demo Mode</h2>
        <p className="small">
          {demoActive
            ? demoReason
            : 'Demo Mode is off — the app is reading Arbitrum Sepolia over the configured RPC.'}
        </p>
        <p className="small muted">
          When Demo Mode is on, every number, event and balance is a deterministic fixture and is
          labelled “Demo fixture” wherever it appears — not only on this screen. Nothing is broadcast
          and no transaction hash is ever produced.
        </p>
        <p className="tiny muted">Data source: {adapterLabel}</p>
      </section>

      <section className="card stack" aria-label="Network and contract">
        <h2>Network and contract</h2>
        <dl className="kv">
          <dt>Chain</dt>
          <dd>
            {ARBITRUM_SEPOLIA.name} · id {ARBITRUM_SEPOLIA.id} · {ARBITRUM_SEPOLIA.hexId}
          </dd>
          <dt>Settles to</dt>
          <dd className="prose">{ARBITRUM_SEPOLIA.settlesTo}</dd>
          <dt>Gas token</dt>
          <dd>{ARBITRUM_SEPOLIA.gasToken}</dd>
          <dt>RPC</dt>
          <dd className="mono breakable">{config.rpcUrl}</dd>
          <dt>Explorer</dt>
          <dd className="mono breakable">
            <a href={config.explorerUrl} target="_blank" rel="noreferrer noopener">
              {config.explorerUrl}
            </a>
          </dd>
          <dt>Guardian contract</dt>
          <dd className="mono breakable">
            {snapshot?.guardianAddress ? (
              demoActive ? (
                <>
                  {snapshot.guardianAddress} <span className="tiny muted">(demo fixture address)</span>
                </>
              ) : (
                <a
                  href={explorerAddressUrl(snapshot.guardianAddress)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {snapshot.guardianAddress}
                </a>
              )
            ) : (
              'not deployed yet'
            )}
          </dd>
          <dt>Event polling</dt>
          <dd className="prose">
            every {config.pollIntervalMs} ms over {config.lookbackBlocks.toString()} blocks — the
            public Arbitrum RPC has no WebSocket, so the app polls getLogs
          </dd>
          <dt>Repository</dt>
          <dd className="breakable">
            <a href={config.repoUrl} target="_blank" rel="noreferrer noopener">
              {config.repoUrl}
            </a>
          </dd>
        </dl>
      </section>

      <section className="card stack" aria-label="Safety limits">
        <h2>Safety limits</h2>
        <dl className="kv">
          <dt>Maximum single transfer</dt>
          <dd>{formatEthWithUnit(policy.maxTransferWei)}</dd>
          <dt>Allowlisted recipients</dt>
          <dd className="mono breakable small">
            {policy.allowedRecipients.length > 0 ? policy.allowedRecipients.join(', ') : 'none configured'}
          </dd>
          <dt>Allowed methods</dt>
          <dd>{policy.allowedMethods.join(' ')}</dd>
          <dt>Policy version</dt>
          <dd className="mono">{policy.version}</dd>
        </dl>
        <p className="small muted">
          The contract enforces the same approver, allowlist and limit on chain. The interface cannot
          widen them, and neither can the model.
        </p>
      </section>

      <section className="card stack" aria-label="AI provider">
        <h2>AI provider</h2>
        <p className="small">
          {aiName} — {aiReason}
        </p>
        <p className="small muted">
          The API key is entered here and held in memory for this browser session only. It is never
          written to storage, never logged, and never placed in a VITE_ variable — anything with that
          prefix ships to the browser and must be treated as public. Reloading the page clears it.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="ai-key">
            Session API key (optional)
          </label>
          <input
            id="ai-key"
            className="input"
            type="password"
            autoComplete="off"
            value={keyDraft}
            onChange={(event) => setKeyDraft(event.target.value)}
            placeholder={aiKeySet ? 'A session key is set' : 'Leave empty to use the local mock adapter'}
          />
        </div>
        <div className="row">
          <button type="button" className="btn btn--sm" onClick={() => setAiKey(keyDraft)}>
            Use this key for the session
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setKeyDraft('');
              setAiKey(null);
            }}
          >
            Clear key
          </button>
        </div>
        {!config.aiEndpoint ? (
          <p className="tiny muted">
            No VITE_AI_ENDPOINT is configured, so the offline mock adapter is used whatever you enter.
          </p>
        ) : null}
      </section>

      <section className="card stack" aria-label="State preview">
        <h2>Preview a state</h2>
        <p className="small muted">
          These switches simulate conditions that depend on the outside world, so every required state
          can be reached during a review. They change this browser session only and never touch the
          chain.
        </p>
        <div className="row" role="group" aria-label="Simulated state">
          {SIMULATIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="nav__item"
              aria-pressed={simulated === option.id}
              style={simulated === option.id ? { borderColor: 'var(--lime)' } : undefined}
              onClick={() => setSimulated(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {config.warnings.length > 0 ? (
        <Notice tone="warning" title="Configuration warnings">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {config.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <section className="card stack" aria-label="Limitations">
        <h2>Known limitations</h2>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Testnet only. No mainnet, Arbitrum One or Arbitrum Nova path exists in the code.</li>
          <li>Event history covers the polling window, not the full chain history — there is no indexer.</li>
          <li>The AI explanation is advisory. It cannot change a verdict, and the app works without it.</li>
          <li>Decisions recorded in Demo Mode are local to the browser session and are not persisted.</li>
          <li>A browser-held API key is visible to anything running in the page; the mock adapter is the safe default.</li>
        </ul>
      </section>
    </div>
  );
}
