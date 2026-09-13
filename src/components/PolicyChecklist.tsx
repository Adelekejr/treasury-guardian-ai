/** The deterministic checks, shown as evidence rather than as a summary. */
import type { PolicyCheck, PolicyCheckStatus } from '../types';

const GLYPH: Record<PolicyCheckStatus, string> = {
  PASS: '[ok]',
  FAIL: '[x]',
  INSUFFICIENT_DATA: '[?]',
  NOT_EVALUATED: '[–]',
};

const COLOUR: Record<PolicyCheckStatus, string> = {
  PASS: 'var(--lime)',
  FAIL: 'var(--danger)',
  INSUFFICIENT_DATA: 'var(--warning)',
  NOT_EVALUATED: 'var(--muted)',
};

const WORD: Record<PolicyCheckStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  INSUFFICIENT_DATA: 'Insufficient data',
  NOT_EVALUATED: 'Not evaluated',
};

export function PolicyChecklist({ checks }: { checks: readonly PolicyCheck[] }): React.JSX.Element {
  return (
    <div className="table-wrap">
      <table className="audit audit--compact">
        <caption>Deterministic policy checks — computed in code before any AI call.</caption>
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Result</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.rule}>
              <th scope="row" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {check.label}
              </th>
              <td className="nowrap" style={{ color: COLOUR[check.status] }}>
                <span className="mono" aria-hidden="true">
                  {GLYPH[check.status]}
                </span>{' '}
                {WORD[check.status]}
              </td>
              <td className="muted">{check.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
