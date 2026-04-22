import { describe, it, expect } from 'vitest';
import { computeVillageStructure } from '../src/lib/simulation/worldGenerator';

describe('computeVillageStructure', () => {
  it('generates between 3 and 5 households', () => {
    const result = computeVillageStructure('test-seed-1', 16);
    expect(result.households.length).toBeGreaterThanOrEqual(3);
    expect(result.households.length).toBeLessThanOrEqual(5);
  });

  it('assigns every villager to a household', () => {
    const result = computeVillageStructure('test-seed-2', 16);
    for (const v of result.villagers) {
      expect(v.householdIndex).toBeGreaterThanOrEqual(0);
      expect(v.householdIndex).toBeLessThan(result.households.length);
    }
  });

  it('initializes needs within [0, 1] bounds', () => {
    const result = computeVillageStructure('test-seed-3', 16);
    for (const v of result.villagers) {
      expect(v.needs.hunger).toBeGreaterThanOrEqual(0);
      expect(v.needs.hunger).toBeLessThanOrEqual(1);
      expect(v.needs.safety).toBeGreaterThanOrEqual(0);
      expect(v.needs.safety).toBeLessThanOrEqual(1);
      expect(v.needs.belonging).toBeGreaterThanOrEqual(0);
      expect(v.needs.belonging).toBeLessThanOrEqual(1);
      expect(v.needs.status).toBeGreaterThanOrEqual(0);
      expect(v.needs.status).toBeLessThanOrEqual(1);
    }
  });

  it('initializes emotions within [0, 1] bounds', () => {
    const result = computeVillageStructure('test-seed-4', 16);
    for (const v of result.villagers) {
      expect(v.emotions.fear).toBeGreaterThanOrEqual(0);
      expect(v.emotions.fear).toBeLessThanOrEqual(1);
      expect(v.emotions.grief).toBeGreaterThanOrEqual(0);
      expect(v.emotions.grief).toBeLessThanOrEqual(1);
      expect(v.emotions.hope).toBeGreaterThanOrEqual(0);
      expect(v.emotions.hope).toBeLessThanOrEqual(1);
      expect(v.emotions.anger).toBeGreaterThanOrEqual(0);
      expect(v.emotions.anger).toBeLessThanOrEqual(1);
    }
  });

  it('generates at least one pair-bonded-partner kinship link for a 16-person village', () => {
    const result = computeVillageStructure('test-seed-5', 16);
    const pairBonds = result.kinshipLinks.filter((k) => k.kind === 'pair_bonded_partner');
    expect(pairBonds.length).toBeGreaterThan(0);
  });

  it('is fully deterministic — same seed produces identical output', () => {
    const a = computeVillageStructure('determinism-seed', 16);
    const b = computeVillageStructure('determinism-seed', 16);

    expect(a.households.map((h) => h.name)).toEqual(b.households.map((h) => h.name));
    expect(a.villagers.map((v) => v.name)).toEqual(b.villagers.map((v) => v.name));
    expect(a.kinshipLinks.length).toBe(b.kinshipLinks.length);
    expect(a.relationships.length).toBe(b.relationships.length);
  });

  it('produces different output for different seeds', () => {
    const a = computeVillageStructure('seed-aaa', 16);
    const b = computeVillageStructure('seed-bbb', 16);
    // Very unlikely to have same first villager name with different seeds
    expect(a.villagers[0]?.name).not.toBe(b.villagers[0]?.name);
  });

  it('generates the correct number of villagers', () => {
    const result = computeVillageStructure('test-seed-count', 12);
    expect(result.villagers.length).toBe(12);
  });

  it('kinship links reference valid villager tempIds', () => {
    const result = computeVillageStructure('test-seed-kin', 16);
    const tempIds = new Set(result.villagers.map((v) => v.tempId));
    for (const k of result.kinshipLinks) {
      expect(tempIds.has(k.fromTempId)).toBe(true);
      expect(tempIds.has(k.toTempId)).toBe(true);
    }
  });
});
