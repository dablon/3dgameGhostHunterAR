import { describe, it, expect } from 'vitest';
import { HalfExtents } from '@domain/value-objects/half-extents';

describe('HalfExtents (value object)', () => {
  it('creates from positive finite numbers', () => {
    const h = HalfExtents.of(1, 2, 3);
    expect(h.x).toBe(1);
    expect(h.y).toBe(2);
    expect(h.z).toBe(3);
  });

  it('rejects negative, zero, NaN, or Infinity', () => {
    expect(() => HalfExtents.of(-1, 1, 1)).toThrow(/positive/);
    expect(() => HalfExtents.of(0, 1, 1)).toThrow(/positive/);
    expect(() => HalfExtents.of(NaN, 1, 1)).toThrow(/finite/);
    expect(() => HalfExtents.of(1, Infinity, 1)).toThrow(/finite/);
  });

  it('cube() is a cubic helper', () => {
    expect(HalfExtents.cube(2).equals(HalfExtents.of(2, 2, 2))).toBe(true);
    expect(() => HalfExtents.cube(0)).toThrow();
    expect(() => HalfExtents.cube(-1)).toThrow();
  });

  it('equals by value', () => {
    expect(HalfExtents.of(1, 2, 3).equals(HalfExtents.of(1, 2, 3))).toBe(true);
    expect(HalfExtents.of(1, 2, 3).equals(HalfExtents.of(1, 2, 4))).toBe(false);
  });
});
