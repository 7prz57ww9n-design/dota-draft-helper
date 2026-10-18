import { heroById } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import { computeCoverage, effectiveTargets, enemyThreatCounts } from './coverage';
import type { ProfileSource } from './profiles';
import { ANSWER_TAGS, TAG_LABELS, TEAM_TAGS, THREAT_LABELS } from './tags';
import type {
  Phase, Player, Position, RatingKey, Reason, SynergyPair, Threat, WinCondition,
} from './types';
import { WIN_PROFILES } from './winConditions';

export interface DraftContext {
  players: Player[];
  /** Ratings of a hero as played at a position. */
  profileOf: ProfileSource;
  threats: Record<HeroId, Threat[]>;
  synergies: SynergyPair[];
  win: WinCondition;
  ourPicks: { heroId: HeroId; position: Position }[];
  enemyPicks: HeroId[];
  bans: HeroId[];
  available: HeroId[] | null; // null = no Captains Draft restriction
}

export interface PickSuggestion {
  heroId: HeroId;
  /** The position this suggestion is scored for. */
  positions: Position[];
  score: number;
  reasons: Reason[];
  /** The same hero scored for its other open positions, best first. */
  alternatives?: { position: Position; score: number }[];
}

const RATING_KEYS: RatingKey[] = [...TEAM_TAGS, ...ANSWER_TAGS];
const PHASES: Phase[] = ['early', 'mid', 'late'];
const ALL_POSITIONS: Position[] = [1, 2, 3, 4, 5];

const name = (id: HeroId) => heroById(id)?.localizedName ?? `Hero ${id}`;

export function suggestPicks(
  ctx: DraftContext,
  limit = 5,
): { top: PickSuggestion[]; bestByPosition: Partial<Record<Position, PickSuggestion | null>> } {
  const filled = new Set(ctx.ourPicks.map((p) => p.position));
  const openPlayers = ctx.players.filter((p) => !filled.has(p.position));
  const openPositions = ALL_POSITIONS.filter((p) => !filled.has(p));

  const taken = new Set<HeroId>([...ctx.ourPicks.map((p) => p.heroId), ...ctx.enemyPicks, ...ctx.bans]);
  const available = ctx.available ? new Set(ctx.available) : null;
  const ourSet = new Set(ctx.ourPicks.map((p) => p.heroId));
  const ourProfiles = ctx.ourPicks.map((p) => ctx.profileOf(p.heroId, p.position));

  const coverage = computeCoverage(ourProfiles);
  const { targets, weights, threatBoosted } = effectiveTargets(
    ctx.win, enemyThreatCounts(ctx.enemyPicks, ctx.threats),
  );
  const mustHave = new Set<RatingKey>(WIN_PROFILES[ctx.win].mustHave);
  const powerWeights = WIN_PROFILES[ctx.win].power;
  const allSameType = (type: string) => ourProfiles.every((p) => p && p.damageType === type);

  // Every open position whose pool has the hero is a separate option.
  const options = new Map<HeroId, { position: Position; comfort: number }[]>();
  for (const player of openPlayers) {
    for (const entry of player.pool) {
      if (taken.has(entry.heroId)) continue;
      if (available && !available.has(entry.heroId)) continue;
      const list = options.get(entry.heroId) ?? [];
      if (!list.some((o) => o.position === player.position)) list.push({ position: player.position, comfort: entry.comfort });
      options.set(entry.heroId, list);
    }
  }

  const scoreOption = (heroId: HeroId, position: Position, comfort: number, flex: boolean): PickSuggestion => {
    const profile = ctx.profileOf(heroId, position);
    const reasons: Reason[] = [];
    const add = (label: string, points: number) => {
      if (points !== 0) reasons.push({ label, points });
    };

    for (const k of RATING_KEYS) {
      const rating = profile?.ratings[k] ?? 0;
      const gap = Math.max(0, targets[k] - coverage[k]);
      const points = weights[k] * Math.min(rating, gap);
      if (points === 0) continue;
      const threat = threatBoosted[k];
      if (threat) {
        const who = ctx.enemyPicks.filter((id) => ctx.threats[id]?.includes(threat)).map(name);
        add(`Answers ${THREAT_LABELS[threat].toLowerCase()} (${who.join(', ')})`, points);
      } else {
        add(mustHave.has(k) ? `${TAG_LABELS[k]} (must-have)` : TAG_LABELS[k], points);
      }
    }

    if (profile) {
      let power = 0;
      for (const ph of PHASES) power += powerWeights[ph] * profile.power[ph] * 0.5;
      add('Power curve', power);
    }

    add('Comfort', (comfort - 2) * 2);

    let duos = 0;
    for (const pair of ctx.synergies) {
      const other = pair.a === heroId ? pair.b : pair.b === heroId ? pair.a : null;
      if (other === null || !ourSet.has(other)) continue;
      add(`Synergy with ${name(other)}`, pair.strength);
      if (pair.laneDuo) duos += 1;
    }
    add('Lane duo', duos);

    if (
      profile &&
      ((coverage.setup >= 2 && (profile.ratings.followUp ?? 0) >= 2) ||
        (coverage.followUp >= 2 && (profile.ratings.setup ?? 0) >= 2))
    ) {
      add('Combo setup→follow-up', 2);
    }

    if (flex) add('Flex pick', 1);

    if (profile && ctx.ourPicks.length >= 2 && allSameType(profile.damageType)) {
      add(`All ${profile.damageType} damage`, -2);
    }

    reasons.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
    const score = reasons.reduce((sum, r) => sum + r.points, 0);
    return { heroId, positions: [position], score, reasons };
  };

  const better = (a: PickSuggestion, b: PickSuggestion) =>
    b.score - a.score || a.heroId - b.heroId || a.positions[0] - b.positions[0];

  const all: PickSuggestion[] = []; // every (hero, position) option
  const perHero: PickSuggestion[] = []; // each hero at its best position
  for (const [heroId, opts] of options) {
    const flex = ctx.ourPicks.length < 2 && opts.length >= 2;
    const scored = opts.map((o) => scoreOption(heroId, o.position, o.comfort, flex)).sort(better);
    all.push(...scored);
    const [best, ...rest] = scored;
    perHero.push(rest.length
      ? { ...best, alternatives: rest.map((s) => ({ position: s.positions[0], score: s.score })) }
      : best);
  }
  perHero.sort(better);
  all.sort(better);

  const bestByPosition: Partial<Record<Position, PickSuggestion | null>> = {};
  for (const pos of openPositions) {
    bestByPosition[pos] = all.find((s) => s.positions[0] === pos) ?? null;
  }
  return { top: perHero.slice(0, limit), bestByPosition };
}
