/** The deterministic checks, shown as evidence rather than as a summary. */
import type { PolicyCheck, PolicyCheckStatus } from '../types';
import { IconCheck, IconCross, IconDash, IconUnknown } from './Icons';

const ICON: Record<PolicyCheckStatus, (props: { size?: number }) => React.JSX.Element> = {
  PASS: IconCheck,
  FAIL: IconCross,
  INSUFFICIENT_DATA: IconUnknown,
  NOT_EVALUATED: IconDash,
};

const COLOUR: Record<PolicyCheckStatus, string> = {
  PASS: 'var(--lime)',
  FAIL: 'var(--danger)',
  INSUFFICIENT_DATA: 'var(--warning)',
  NOT_EVALUATED: 'var(--muted-dim)',
};

const WORD: Record<PolicyCheckStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  INSUFFICIENT_DATA: 'No data',
  NOT_EVALUATED: 'Skipped',
};

export function PolicyChecklist({ checks }: { checks: readonly PolicyCheck[] }): React.JSX.Element {
  return (
    <>
    <div className="table-wrap table-wrap--responsive">
      <table className="audit audit--compact">
        <caption>Deterministic policy checks, computed in code before any AI call.</caption>
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Result</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => {
            const Icon = ICON[check.status];
            return (
              <tr key={check.rule}>
                <th scope="row">{check.label}</th>
                <td className="nowrap" style={{ color: COLOUR[check.status] }}>
                  <span className="row row--tight" style={{ flexWrap: 'nowrap' }}>
                    <Icon size={13} />
                    {WORD[check.status]}
                  </span>
                </td>
                <td className="muted prose">{check.detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <ul className="check-list" aria-label="Deterministic policy checks">
      {checks.map((check) => {
        const Icon = ICON[check.status];
        return (
          <li key={check.rule} className="check">
            <span className="check__icon" style={{ color: COLOUR[check.status] }}>
              <Icon size={14} />
            </span>
            <div>
              <p className="check__label">
                {check.label} <span className="dim tiny">· {WORD[check.status]}</span>
              </p>
              <p className="check__detail">{check.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}
