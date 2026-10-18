import { heroById } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import { computeCoverage, effectiveTargets, enemyThreatCounts } from './coverage';
import { ANSWER_TAGS, TAG_LABELS, TEAM_TAGS, THREAT_LABELS } from './tags';
import type {
  HeroProfile, Phase, Player, Position, RatingKey, Reason, SynergyPair, Threat, WinCondition,
} from './types';
import { WIN_PROFILES } from './winConditions';

export interface DraftContext {
  players: Player[];
  profiles: Record<HeroId, HeroProfile>;
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
  positions: Position[];
  score: number;
  reasons: Reason[];
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
  const ourIds = ctx.ourPicks.map((p) => p.heroId);
  const ourSet = new Set(ourIds);

  const coverage = computeCoverage(ourIds, ctx.profiles);
  const { targets, weights, threatBoosted } = effectiveTargets(
    ctx.win, enemyThreatCounts(ctx.enemyPicks, ctx.threats),
  );
  const mustHave = new Set<RatingKey>(WIN_PROFILES[ctx.win].mustHave);
  const powerWeights = WIN_PROFILES[ctx.win].power;

  const candidates = new Map<HeroId, { positions: Position[]; comfort: number }>();
  for (const player of openPlayers) {
    for (const entry of player.pool) {
      if (taken.has(entry.heroId)) continue;
      if (available && !available.has(entry.heroId)) continue;
      const c = candidates.get(entry.heroId) ?? { positions: [], comfort: 0 };
      if (!c.positions.includes(player.position)) c.positions.push(player.position);
      c.comfort = Math.max(c.comfort, entry.comfort);
      candidates.set(entry.heroId, c);
    }
  }

  const ourProfiles = ourIds.map((id) => ctx.profiles[id]);
  const allSameType = (type: string) => ourProfiles.every((p) => p && p.damageType === type);

  const suggestions: PickSuggestion[] = [];
  for (const [heroId, c] of candidates) {
    const profile = ctx.profiles[heroId];
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

    add('Comfort', (c.comfort - 2) * 2);

    const partners: HeroId[] = [];
    let synergy = 0;
    let duos = 0;
    for (const pair of ctx.synergies) {
      const other = pair.a === heroId ? pair.b : pair.b === heroId ? pair.a : null;
      if (other === null || !ourSet.has(other)) continue;
      synergy += pair.strength;
      partners.push(other);
      if (pair.laneDuo) duos += 1;
    }
    add(`Synergy with ${partners.map(name).join(', ')}`, synergy);
    add('Lane duo', duos);

    if (
      profile &&
      ((coverage.setup >= 2 && (profile.ratings.followUp ?? 0) >= 2) ||
        (coverage.followUp >= 2 && (profile.ratings.setup ?? 0) >= 2))
    ) {
      add('Combo setup→follow-up', 2);
    }

    if (ctx.ourPicks.length < 2) {
      const pools = openPlayers.filter((p) => p.pool.some((e) => e.heroId === heroId)).length;
      if (pools >= 2) add('Flex pick', 1);
    }

    if (profile && ourIds.length >= 2 && allSameType(profile.damageType)) {
      add(`All ${profile.damageType} damage`, -2);
    }

    reasons.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
    const score = reasons.reduce((sum, r) => sum + r.points, 0);
    suggestions.push({ heroId, positions: c.positions.sort((a, b) => a - b), score, reasons });
  }

  const better = (a: PickSuggestion, b: PickSuggestion) => b.score - a.score || a.heroId - b.heroId;
  suggestions.sort(better);

  const bestByPosition: Partial<Record<Position, PickSuggestion | null>> = {};
  for (const pos of openPositions) {
    bestByPosition[pos] = suggestions.find((s) => s.positions.includes(pos)) ?? null;
  }
  return { top: suggestions.slice(0, limit), bestByPosition };
}
