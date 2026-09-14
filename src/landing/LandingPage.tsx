/**
 * Landing page at "/". The dashboard lives at "/app".
 *
 * Every figure on this page is measured from the repository; stats.ts records
 * how. The verdict object further down is produced at load time by the real
 * policy engine rather than transcribed by hand.
 */
import { appConfig } from '../config/env';
import { ARBITRUM_SEPOLIA, SUPPORTED_CHAIN_ID } from '../config/network';
import { POLICY_VERSION } from '../config/policy';
import { DEMO_EVENTS } from '../data/demo.events';
import { DEMO_CLOCK_SECONDS } from '../data/demo.seed';
import { DEMO_MAX_TRANSFER_WEI, DEMO_POLICY_METHODS, DEMO_POLICY_RECIPIENTS } from '../data/demo.policy';
import { assessEvent } from '../services/policy/rules';
import { STATS } from './stats';
import './landing.css';

/* ------------------------------------------------------------------ content */

const STEPS = [
  {
    no: '01',
    title: 'Fetch',
    body:
      'The chain adapter polls getLogs over HTTP on an interval you configure. The public Arbitrum RPC has no WebSocket, so there is no subscription watcher in the codebase. Each event is stamped ONCHAIN or DEMO_FIXTURE and the interface shows that on every row.',
    tag: 'services/chain/viemAdapter.ts',
  },
  {
    no: '02',
    title: 'Classify',
    body:
      'Recipient, value and method are decoded into a typed TransactionEvent with a plain-language summary of what the transaction does. This step describes what happened. It does not judge it.',
    tag: 'types/index.ts',
  },
  {
    no: '03',
    title: 'Deterministic policy',
    body:
      'Five rules run in code and produce the verdict. The function is pure, takes no model input and has no randomness, so the same event always yields the same result. All of it happens before any model is called.',
    tag: 'services/policy/rules.ts',
    accent: true,
  },
  {
    no: '04',
    title: 'The AI explains',
    body:
      'The finished verdict goes to the model as read-only context. Its reply is validated against a schema that has no verdict field, so a verdict cannot be expressed through the boundary at all. The model has to cite observed facts. Anything else it returns is listed in the interface as discarded.',
    tag: 'services/ai/guard.ts',
  },
  {
    no: '05',
    title: 'A human approves',
    body:
      'Nothing moves until a person sees the exact recipient, value, chain, method, decoded calldata and reason, then approves it by hand. The contract re-checks every limit before it releases a single wei.',
    tag: 'contracts/TreasuryGuardian.sol',
  },
] as const;

const ENFORCEMENT = [
  {
    condition: 'Chain is not 421614',
    verdict: 'BLOCKED',
    tone: 'blocked' as const,
    ui: 'Approval flow is unreachable. A wrong-network state replaces the action.',
    chain: 'No other network is configured, and the deploy script refuses any other chain id.',
  },
  {
    condition: 'Amount over the limit',
    verdict: 'BLOCKED',
    tone: 'blocked' as const,
    ui: 'No action can be prepared from the event.',
    chain: 'propose() reverts AmountOverLimit, and execute() re-checks the limit.',
  },
  {
    condition: 'Recipient not allowlisted',
    verdict: 'REVIEW_REQUIRED',
    tone: 'review' as const,
    ui: 'Flagged for a human, with the failing rule and its reason shown.',
    chain: 'propose() reverts RecipientNotAllowed. The allowlist is immutable.',
  },
  {
    condition: 'Method not allowlisted',
    verdict: 'REVIEW_REQUIRED',
    tone: 'review' as const,
    ui: 'Flagged for a human, with the method named.',
    chain: 'propose() reverts MethodNotAllowed.',
  },
  {
    condition: 'Transaction data missing',
    verdict: 'INSUFFICIENT_DATA',
    tone: 'unknown' as const,
    ui: 'No action can be prepared; the gaps are listed explicitly.',
    chain: 'Nothing reaches the contract.',
  },
  {
    condition: 'Every rule passes',
    verdict: 'LOW_RISK',
    tone: 'low' as const,
    ui: 'An action can be prepared, and it still needs explicit human approval.',
    chain: 'execute() reverts unless approve() was called first by the authorised approver.',
  },
  {
    condition: 'Model returns a verdict',
    verdict: 'DISCARDED',
    tone: 'blocked' as const,
    ui: 'The field is dropped by the schema and named in the interface as ignored.',
    chain: 'The model never touches a transaction. It has no signer and no call path.',
  },
] as const;

const TONE_CLASS: Record<string, string> = {
  blocked: 'chip--blocked',
  review: 'chip--review',
  unknown: 'chip--unknown',
  low: 'chip--low',
};

/* ------------------------------------------------- the live verdict object */

/** Runs the real engine on a real fixture when the page loads. */
function buildVerdictSample(): string {
  const policy = {
    chainId: SUPPORTED_CHAIN_ID,
    allowedRecipients: DEMO_POLICY_RECIPIENTS,
    allowedMethods: DEMO_POLICY_METHODS,
    maxTransferWei: DEMO_MAX_TRANSFER_WEI,
    version: POLICY_VERSION,
  };
  const event = DEMO_EVENTS[1];
  if (!event) return '';
  const assessment = assessEvent(event, policy, DEMO_CLOCK_SECONDS);

  const checkLines = assessment.checks.map((check) => {
    const rule = `"${check.rule}",`.padEnd(24);
    const status = `"${check.status}",`.padEnd(9);
    return `    { "rule": ${rule} "status": ${status} "verdictOnFailure": "${check.verdictOnFailure}" }`;
  });

  return [
    '{',
    `  "eventId": "${assessment.eventId}",`,
    `  "verdict": "${assessment.verdict}",`,
    '  "checks": [',
    checkLines.join(',\n'),
    '  ],',
    '  "reasons": [',
    ...assessment.reasons.map((reason) => `    "${reason}"`),
    '  ],',
    `  "observedFacts": [ // ${assessment.observedFacts.length} facts, the only evidence the AI may cite`,
    '  ],',
    `  "evaluatedAt": ${assessment.evaluatedAt},`,
    `  "policyVersion": "${assessment.policyVersion}"`,
    '}',
  ].join('\n');
}

const TOKEN_RE = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b\d+\b)|(\/\/.*)/g;

function classForString(value: string): string {
  if (value === '"PASS"') return 'tok-pass';
  if (value === '"FAIL"') return 'tok-fail';
  if (value === '"REVIEW_REQUIRED"' || value === '"BLOCKED"' || value === '"INSUFFICIENT_DATA"') {
    return 'tok-verdict';
  }
  return 'tok-str';
}

function JsonBlock({ source }: { source: string }): React.JSX.Element {
  return (
    <pre className="lp__pre">
      <code>
        {source.split('\n').map((line, lineIndex) => {
          const nodes: React.JSX.Element[] = [];
          let cursor = 0;
          let match: RegExpExecArray | null;
          TOKEN_RE.lastIndex = 0;
          while ((match = TOKEN_RE.exec(line)) !== null) {
            if (match.index > cursor) {
              nodes.push(<span key={`${lineIndex}-t${cursor}`}>{line.slice(cursor, match.index)}</span>);
            }
            const [text, key, str, num, comment] = match;
            const className = key ? 'tok-key' : str ? classForString(str) : num ? 'tok-num' : comment ? 'tok-comment' : '';
            nodes.push(
              <span key={`${lineIndex}-m${match.index}`} className={className}>
                {text}
              </span>,
            );
            cursor = match.index + text.length;
          }
          if (cursor < line.length) {
            nodes.push(<span key={`${lineIndex}-e`}>{line.slice(cursor)}</span>);
          }
          return (
            <span key={lineIndex}>
              {nodes}
              {'\n'}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

/* ------------------------------------------------------------------- page */

export function LandingPage(): React.JSX.Element {
  const verdictSample = buildVerdictSample();

  return (
    <div className="lp">
      <div className="lp__top">
        <div className="lp__wrap">
          <a className="lp__brand" href="/">
            <span className="brand__mark">TG</span>
            Treasury Guardian
          </a>
        </div>
      </div>

      <header className="lp__hero">
        <div className="lp__wrap">
          <h1 className="lp__h1">
            The AI explains.
            <br />
            <em>It never decides.</em>
          </h1>
          <p className="lp__claim">
            Treasury Guardian AI watches an {ARBITRUM_SEPOLIA.name} treasury and explains what each
            transaction does. Risk verdicts come from rules in code that run before any model is
            called. Nothing the model returns can change one.
          </p>
          <div className="lp__cta">
            <a className="lp__btn lp__btn--primary" href="/app">
              Open the dashboard
            </a>
            <a
              className="lp__btn"
              href={`${appConfig.repoUrl}/blob/main/ARCHITECTURE.md`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Read the architecture
            </a>
          </div>
        </div>
      </header>

      <section className="lp__stats" aria-label="Measured facts about this repository">
        {STATS.map((stat) => (
          <div key={stat.label} className="lp__stat">
            <span className="lp__statValue">{stat.value}</span>
            <span className="lp__statLabel">{stat.label}</span>
            <span className="lp__statNote">{stat.note}</span>
          </div>
        ))}
      </section>

      <section className="lp__section">
        <div className="lp__wrap">
          <p className="lp__eyebrow">The problem</p>
          <div className="lp__split">
            <div>
              <h2 className="lp__h2">An agent that can approve its own transactions is not a safety feature.</h2>
              <p className="lp__lead">
                The pitch is usually the same. An agent watches the treasury, decides what looks
                suspicious, and acts. That asks you to trust a model&rsquo;s judgement at the moment
                money moves, which is where judgement is the wrong instrument.
              </p>
            </div>
            <div>
              <p className="lp__quote">
                If a model can approve a transaction, everything the model reads becomes an attack
                surface, and no approval can be checked afterwards.
              </p>
              <ul className="lp__bullets" style={{ marginTop: 28 }}>
                <li className="lp__bullet">
                  <strong>A judgement is not a rule.</strong>
                  <span>
                    It shifts between runs, prompts, temperatures and providers. The same transfer
                    can pass on Tuesday and fail on Wednesday.
                  </span>
                </li>
                <li className="lp__bullet">
                  <strong>You cannot unit test one.</strong>
                  <span>
                    There is no assertion to write for &ldquo;looked fine to me&rdquo;, so there is
                    no regression to catch when it stops being true.
                  </span>
                </li>
                <li className="lp__bullet">
                  <strong>Everything it reads was written by someone else.</strong>
                  <span>
                    A memo field, a token name or a contract comment all arrive as text, and text
                    that reaches a decision-maker works as an instruction.
                  </span>
                </li>
                <li className="lp__bullet">
                  <strong>An agent holding a key has no upper bound.</strong>
                  <span>
                    Its worst case is the whole balance. Limits have to live somewhere the agent
                    cannot reach.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="lp__section">
        <div className="lp__wrap">
          <p className="lp__eyebrow">How it works</p>
          <h2 className="lp__h2">Five steps, and the model only gets one of them.</h2>
          <p className="lp__lead">
            The order carries the whole argument. By the time the model is asked anything, the
            verdict already exists and is final.
          </p>

          <ol className="lp__steps">
            {STEPS.map((step) => (
              <li key={step.no} className={`lp__step${'accent' in step && step.accent ? ' lp__step--accent' : ''}`}>
                <span className="lp__stepNo">{step.no}</span>
                <div>
                  <h3 className="lp__stepTitle">{step.title}</h3>
                  <p className="lp__stepBody">{step.body}</p>
                  <span className="lp__stepTag">{step.tag}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp__section">
        <div className="lp__wrap">
          <p className="lp__eyebrow">Enforcement</p>
          <h2 className="lp__h2">What actually happens when a rule fails.</h2>
          <p className="lp__lead">
            Every rule has one deterministic verdict, one consequence in the interface and one
            consequence on chain. The interface cannot widen the contract&rsquo;s limits, and the
            contract does not trust the interface.
          </p>

          <div className="lp__tableWrap">
            <table className="lp__table">
              <thead>
                <tr>
                  <th scope="col">Condition</th>
                  <th scope="col">Verdict</th>
                  <th scope="col">In the interface</th>
                  <th scope="col">On chain</th>
                </tr>
              </thead>
              <tbody>
                {ENFORCEMENT.map((row) => (
                  <tr key={row.condition}>
                    <td>{row.condition}</td>
                    <td>
                      <span className={`chip ${TONE_CLASS[row.tone]}`}>{row.verdict}</span>
                    </td>
                    <td>{row.ui}</td>
                    <td>{row.chain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lp__cards">
            {ENFORCEMENT.map((row) => (
              <div key={row.condition} className="lp__card">
                <div className="lp__cardTop">
                  <span className="lp__cardCond">{row.condition}</span>
                  <span className={`chip ${TONE_CLASS[row.tone]}`}>{row.verdict}</span>
                </div>
                <dl className="lp__cardRow">
                  <dt>Interface</dt>
                  <dd>{row.ui}</dd>
                  <dt>On chain</dt>
                  <dd>{row.chain}</dd>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp__section">
        <div className="lp__wrap">
          <p className="lp__eyebrow">Evidence</p>
          <h2 className="lp__h2">Every verdict comes back as this object.</h2>
          <p className="lp__lead">
            This is real output, produced by this page as it rendered. It carries the verdict, every
            rule that ran, the reason in plain language, and the fixed set of facts the model is
            allowed to cite.
          </p>

          <div className="lp__code">
            <div className="lp__codeHead">
              <span>RiskAssessment · services/policy/rules.ts</span>
              <span>label and detail omitted per check for width</span>
            </div>
            <JsonBlock source={verdictSample} />
          </div>
          <p className="lp__note">
            The AI response type next to this object has no verdict field, so there is no key for a
            model to set. A test feeds it a hostile response carrying <code>verdict</code>,{' '}
            <code>override</code> and an injection in the rationale, then asserts the assessment
            comes back unchanged by object identity.
          </p>
        </div>
      </section>

      <section className="lp__end">
        <div className="lp__wrap">
          <h2 className="lp__h2">See it refuse something.</h2>
          <p className="lp__lead">
            The dashboard opens in Demo Mode on deterministic fixtures. It needs no wallet and no
            keys, and nothing is broadcast. Four of the eight sample events fail policy.
          </p>
          <div className="lp__cta">
            <a className="lp__btn lp__btn--primary" href="/app">
              Open the dashboard
            </a>
            <a className="lp__btn" href={appConfig.repoUrl} target="_blank" rel="noreferrer noopener">
              View the source
            </a>
          </div>
        </div>
      </section>

      <div className="lp__wrap">
        <footer className="lp__footer">
          <span>
            {ARBITRUM_SEPOLIA.name} testnet prototype · chain {SUPPORTED_CHAIN_ID} only · no real
            funds · not financial advice
          </span>
          <a href={appConfig.repoUrl} target="_blank" rel="noreferrer noopener">
            Source on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
