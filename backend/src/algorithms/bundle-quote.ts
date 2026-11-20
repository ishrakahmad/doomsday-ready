export interface BundleLine {
  size: number;
  count: number;
}

export type BundleQuote =
  | { possible: true; totalBundles: number; bundles: BundleLine[] }
  | { possible: false; totalBundles: null; bundles: [] };


export function quoteBundles(bundleSizes: readonly number[], groupSize: number): BundleQuote {
  const best = new Array<number>(groupSize + 1).fill(Infinity);
  const lastSize = new Array<number>(groupSize + 1).fill(0);
  best[0] = 0;

  for (let seats = 1; seats <= groupSize; seats++) {
    for (const size of bundleSizes) {
      if (size <= seats && best[seats - size] + 1 < best[seats]) {
        best[seats] = best[seats - size] + 1;
        lastSize[seats] = size;
      }
    }
  }

  if (best[groupSize] === Infinity) {
    return { possible: false, totalBundles: null, bundles: [] };
  }

  
  const counts = new Map<number, number>();
  for (let seats = groupSize; seats > 0; seats -= lastSize[seats]) {
    const size = lastSize[seats];
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  const bundles = [...counts]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.size - a.size);

  return { possible: true, totalBundles: best[groupSize], bundles };
}