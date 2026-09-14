/**
 * Screen 4. Approval flow.
 *
 * Nothing here is automatic. The exact recipient, value, chain, method,
 * decoded calldata and reason are all shown, the testnet warning is
 * unavoidable, and the approve button stays disabled until a human ticks the
 * review box.
 */
import { useEffect, useState } from 'react';
import { ARBITRUM_SEPOLIA, explorerTxUrl } from '../config/network';
import { demoLabelFor } from '../data/demo.accounts';
import { formatEthWithUnit, formatTimestamp } from '../lib/format';
import { ProvenanceMark, RiskBadge } from '../components/Badges';
import { Notice } from '../components/Notice';
import { PolicyChecklist } from '../components/PolicyChecklist';
import { EmptyState } from '../components/Skeleton';
import { StatusStrip } from '../components/StatusStrip';
import { useApp } from '../state/useApp';
import { hrefFor, type Route } from '../state/router';

export function ApprovalFlow({
  eventId,
  navigate,
}: {
  eventId: string;
  navigate: (route: Route) => void;
}): React.JSX.Element {
  const {
    events,
    assessments,
    proposals,
    approvals,
    prepare,
    approve,
    reject,
    submitting,
    submitError,
    submissionSteps,
    demoActive,
    wallet,
    network,
    contractAvailable,
    contractReason,
  } = useApp();

  const [reviewed, setReviewed] = useState(false);
  const [note, setNote] = useState('');

  const event = events.find((candidate) => candidate.id === eventId);
  const assessment = assessments.get(eventId);
  const action = proposals[eventId];
  const approval = approvals[eventId];

  useEffect(() => {
    if (event && !proposals[eventId]) prepare(eventId);
  }, [event, eventId, prepare, proposals]);

  if (!event || !assessment) {
    return (
      <div className="stack stack--lg">
        <StatusStrip />
        <EmptyState title="Nothing to approve" detail="This event is not in the current window." />
        <a className="btn btn--sm" href={hrefFor({ name: 'overview' })}>
          Back to overview
        </a>
      </div>
    );
  }

  const blockedByPolicy = assessment.verdict === 'BLOCKED' || assessment.verdict === 'INSUFFICIENT_DATA';
  const wrongNetwork = network?.state === 'WRONG_NETWORK';
  const walletReady = demoActive || (wallet.address !== null && !wrongNetwork);
  const canApprove =
    !blockedByPolicy && !!action && reviewed && walletReady && contractAvailable && !submitting;

  const blockers: string[] = [];
  if (blockedByPolicy) blockers.push('Deterministic policy blocks this action.');
  if (!action) blockers.push('No action could be prepared from this event.');
  if (!walletReady && !demoActive) blockers.push('Connect a wallet on Arbitrum Sepolia to approve.');
  if (wrongNetwork) blockers.push('Your wallet is on an unsupported chain.');
  if (!contractAvailable) blockers.push(contractReason ?? 'The guardian contract is unavailable.');
  if (!reviewed) blockers.push('Tick the review confirmation to enable approval.');

  return (
    <div className="stack stack--lg">
      <StatusStrip />

      <div className="row row--between">
        <div>
          <h1>Approval flow</h1>
          <p className="muted small">Every field below is exactly what would be submitted.</p>
        </div>
        <div className="row">
          <RiskBadge verdict={assessment.verdict} />
          <ProvenanceMark provenance={event.provenance} />
        </div>
      </div>

      <Notice tone="warning" title="Testnet only. Arbitrum Sepolia, chain 421614.">
        This app never operates on mainnet and never uses real funds. Approval sends testnet ETH only.
      </Notice>

      <section className="card stack" aria-label="Proposed action">
        <div className="card__head">
          <h2>Proposed action</h2>
          <span className="prov">{action?.id ?? '—'}</span>
        </div>
        <dl className="kv">
          <dt>Chain</dt>
          <dd>
            {ARBITRUM_SEPOLIA.name} ({ARBITRUM_SEPOLIA.id})
          </dd>
          <dt>Recipient</dt>
          <dd className="mono breakable">
            {action?.to ?? event.to ?? 'missing'}
            {demoLabelFor(action?.to ?? event.to) ? (
              <div className="tiny dim prose">{demoLabelFor(action?.to ?? event.to)}</div>
            ) : null}
          </dd>
          <dt>Value</dt>
          <dd>{formatEthWithUnit(action?.valueWei ?? event.valueWei)}</dd>
          <dt>Method</dt>
          <dd>{action?.method ?? event.method ?? 'missing'}</dd>
          <dt>Decoded calldata</dt>
          <dd className="small breakable">{action?.calldataSummary ?? 'No action prepared.'}</dd>
          <dt>Reason</dt>
          <dd className="small prose">{action?.reason ?? event.decodedSummary}</dd>
          <dt>Prepared at</dt>
          <dd>{formatTimestamp(action?.createdAt ?? null)}</dd>
        </dl>
      </section>

      <section className="stack" aria-label="Policy result">
        <h2>Policy result</h2>
        <PolicyChecklist checks={assessment.checks} />
      </section>

      {approval ? (
        <Notice
          tone={approval.decision === 'APPROVED' ? 'positive' : 'info'}
          title={`Decision recorded: ${approval.decision === 'APPROVED' ? 'approved' : 'rejected'}.`}
        >
          <dl className="kv">
            <dt>Status</dt>
            <dd>{approval.status.replace(/_/g, ' ').toLowerCase()}</dd>
            <dt>Decided by</dt>
            <dd className="mono breakable">{approval.decidedBy ?? 'unknown'}</dd>
            <dt>Note</dt>
            <dd className="prose">{approval.note || '—'}</dd>
            <dt>Transaction</dt>
            <dd className="mono breakable">
              {approval.txHash ? (
                <a href={explorerTxUrl(approval.txHash)} target="_blank" rel="noreferrer noopener">
                  {approval.txHash}
                </a>
              ) : (
                'no transaction was broadcast'
              )}
            </dd>
          </dl>
        </Notice>
      ) : null}

      {submissionSteps.length > 0 ? (
        <section className="card stack" aria-label="Submission steps">
          <h3>Submission</h3>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }}>
            {submissionSteps.map((step) => (
              <li key={step.id} className="small prose">
                <strong>{step.label}</strong> · {step.state} · {step.message}
                {step.hash ? <div className="tiny mono breakable">{step.hash}</div> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {submitError ? (
        <Notice tone="danger" title="The submission did not complete.">
          {submitError}
        </Notice>
      ) : null}

      <section className="card stack" aria-label="Decision">
        <h2>Decision</h2>

        <div className="field">
          <label className="field__label" htmlFor="approval-note">
            Note for the audit trail (optional)
          </label>
          <input
            id="approval-note"
            className="input"
            value={note}
            onChange={(changeEvent) => setNote(changeEvent.target.value)}
            placeholder="Why you are approving or rejecting this"
          />
        </div>

        <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(changeEvent) => setReviewed(changeEvent.target.checked)}
            style={{ marginTop: 4, width: 18, height: 18 }}
          />
          <span className="small">
            I have checked the recipient, the amount, the method and the chain shown above.
          </span>
        </label>

        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canApprove}
            onClick={() => void approve(eventId, note)}
          >
            {submitting ? 'Submitting…' : demoActive ? 'Approve (demo, nothing is sent)' : 'Approve and execute'}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={submitting}
            onClick={() => void reject(eventId, note)}
          >
            Reject
          </button>
          <button type="button" className="btn" onClick={() => navigate({ name: 'event', id: eventId })}>
            Back to inspection
          </button>
        </div>

        {blockers.length > 0 ? (
          <div className="stack" style={{ gap: 4 }}>
            <p className="small muted">Approval is disabled because:</p>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {demoActive ? (
          <p className="tiny muted">
            Demo Mode: approving records the decision locally. No transaction is built, signed or
            broadcast, and no transaction hash exists.
          </p>
        ) : null}
      </section>
    </div>
  );
}
