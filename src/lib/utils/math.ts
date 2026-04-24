export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Box-Muller transform — produces normally distributed samples from a uniform RNG.
// Must use seeded RNG (not Math.random()) to preserve determinism.
export function sampleNormal(mean: number, stdDev: number, rng: () => number): number {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return clamp(mean + z * stdDev, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Gini coefficient — measures inequality in a distribution (0 = perfect equality, 1 = max inequality).
// Used for hierarchy steepness (status score distribution).
export function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * (sorted[i] ?? 0);
  }
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  if (mean === 0) return 0;
  return clamp(numerator / (n * n * mean), 0, 1);
}
