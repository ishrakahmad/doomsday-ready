/**
 * Feature 2 — booking quote (no libraries).
 *
 * Find the fewest bundles whose seats add up to exactly `groupSize`, where
 * every bundle size can be bought any number of times. This is the
 * "minimum coin change" problem, solved with bottom-up dynamic programming.
 *
 * A greedy "largest bundle first" approach is wrong here:
 *   sizes [1, 3, 4], group 6  -> greedy 4+1+1 (3 bundles), optimal 3+3 (2)
 *   sizes [6, 9, 20], group 44 -> greedy 20+20 leaves 4 (fails), optimal 20+9+9+6
 *
 * dp[s]   = fewest bundles that make exactly s seats (Infinity if impossible)
 * last[s] = the bundle size used in the last step of that best solution
 *
 *   dp[0] = 0
 *   dp[s] = min over sizes b <= s of dp[s - b] + 1
 *
 * The quantities are rebuilt by walking `last` back from `groupSize` to 0.
 *
 * Time: O(groupSize × number of sizes) — at most 10,000 × 10 = 100,000 steps.
 * Space: O(groupSize).
 */
export interface BundleLine {
  size: number;
  count: number;
}

export type BundleQuote =
  | { possible: true; totalBundles: number; bundles: BundleLine[] }
  | { possible: false; totalBundles: null; bundles: [] };

export function quoteBundles(bundleSizes: readonly number[], groupSize: number): BundleQuote {
  if (!Number.isInteger(groupSize) || groupSize < 1) {
    throw new RangeError('groupSize must be a positive integer');
  }
  if (bundleSizes.some((b) => !Number.isInteger(b) || b < 1)) {
    throw new RangeError('bundle sizes must be positive integers');
  }

  // Unique sizes, largest first: on a tie the larger bundle wins, which keeps
  // the answer deterministic and prefers fewer, bigger blocks of seats.
  const sizes = [...new Set(bundleSizes)].sort((a, b) => b - a);

  const UNREACHABLE = Number.MAX_SAFE_INTEGER;
  const dp = new Array<number>(groupSize + 1).fill(UNREACHABLE);
  const last = new Array<number>(groupSize + 1).fill(0);
  dp[0] = 0;

  for (let seats = 1; seats <= groupSize; seats++) {
    for (const size of sizes) {
      if (size > seats) continue;
      const previous = dp[seats - size];
      if (previous !== UNREACHABLE && previous + 1 < dp[seats]) {
        dp[seats] = previous + 1;
        last[seats] = size;
      }
    }
  }

  if (dp[groupSize] === UNREACHABLE) {
    return { possible: false, totalBundles: null, bundles: [] };
  }

  const counts = new Map<number, number>();
  for (let seats = groupSize; seats > 0; seats -= last[seats]) {
    counts.set(last[seats], (counts.get(last[seats]) ?? 0) + 1);
  }

  const bundles = [...counts.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.size - a.size);

  return { possible: true, totalBundles: dp[groupSize], bundles };
}
