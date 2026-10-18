import { TAG_DEFINITIONS, TAG_LABELS, TEAM_TAGS, THREAT_LABELS } from '../domain/tags';
import type { RatingKey, Threat } from '../domain/types';

interface Props {
  coverage: Record<RatingKey, number>;
  targets: Record<RatingKey, number>;
  mustHave: RatingKey[];
  threatBoosted: Partial<Record<RatingKey, Threat>>;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

export default function CoveragePanel({ coverage, targets, mustHave, threatBoosted }: Props) {
  const keys: RatingKey[] = [...TEAM_TAGS.filter((k) => targets[k] > 0)];
  for (const k of Object.keys(threatBoosted) as RatingKey[]) if (!keys.includes(k)) keys.push(k);

  return (
    <div className="coverage" aria-label="Team coverage">
      {keys.map((k) => {
        const threat = threatBoosted[k];
        const cur = coverage[k];
        const target = targets[k];
        const pct = target > 0 ? Math.min(100, (cur / target) * 100) : 100;
        return (
          <div key={k} data-testid={`coverage-${k}`} className={`cov-row${threat ? ' boosted' : ''}${cur >= target ? ' met' : ''}`}>
            <span className="cov-label" title={TAG_DEFINITIONS[k]}>
              {TAG_LABELS[k]}
              {mustHave.includes(k) && <span className="must" title="Must-have for this win condition"> must-have</span>}
            </span>
            <span className="cov-bar"><span className="cov-fill" style={{ width: `${pct}%` }} /></span>
            <span className="cov-num">{fmt(cur)}/{fmt(target)}</span>
            {threat && <span className="cov-threat">vs {THREAT_LABELS[threat]}</span>}
          </div>
        );
      })}
    </div>
  );
}
