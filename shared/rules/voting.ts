export interface Tally {
  counts: Record<string, number>;
  ejectedId: string | null;
  tie: boolean;
}

/**
 * Count votes from living voters for living targets (or 'skip'). The single
 * top candidate is ejected; a tie at the top (including skip) ejects no one.
 */
export function tallyVotes(votes: Record<string, string>, aliveIds: readonly string[]): Tally {
  const alive = new Set(aliveIds);
  const counts: Record<string, number> = {};
  for (const [voter, target] of Object.entries(votes)) {
    if (!alive.has(voter)) continue;
    if (target !== 'skip' && !alive.has(target)) continue;
    counts[target] = (counts[target] ?? 0) + 1;
  }
  let max = 0;
  for (const c of Object.values(counts)) max = Math.max(max, c);
  if (max === 0) return { counts, ejectedId: null, tie: false };
  const top = Object.keys(counts).filter((k) => counts[k] === max);
  if (top.length > 1) return { counts, ejectedId: null, tie: true };
  return { counts, ejectedId: top[0] === 'skip' ? null : top[0], tie: false };
}
