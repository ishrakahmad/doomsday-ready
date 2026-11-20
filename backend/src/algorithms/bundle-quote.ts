
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
