import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../src/lib/rng/seededRng';

describe('createSeededRng', () => {
  it('produces stable sequence for same seed', () => {
    const a = createSeededRng('abc');
    const b = createSeededRng('abc');

    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];

    expect(seqA).toEqual(seqB);
  });
});
