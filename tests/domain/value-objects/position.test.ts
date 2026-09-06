import { describe, it, expect } from 'vitest';
import { Position, isPosition } from '@domain/value-objects/position';

describe('Position (value object)', () => {
  it('creates a position from three finite numbers', () => {
    const p = Position.of(1, 2, 3);
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p.z).toBe(3);
  });

  it('rejects non-finite numbers', () => {
    expect(() => Position.of(NaN, 0, 0)).toThrow(/finite/);
    expect(() => Position.of(0, Infinity, 0)).toThrow(/finite/);
    expect(() => Position.of(0, 0, -Infinity)).toThrow(/finite/);
  });

  it('is frozen at runtime', () => {
    const p = Position.of(1, 2, 3);
    expect(Object.isFrozen(p)).toBe(true);
  });

  it('compares by value (structural equality)', () => {
    expect(Position.of(1, 2, 3).equals(Position.of(1, 2, 3))).toBe(true);
    expect(Position.of(1, 2, 3).equals(Position.of(1, 2, 4))).toBe(false);
  });

  it('translates by a vector', () => {
    const p = Position.of(1, 2, 3);
    const moved = p.translate([1, -1, 0]);
    expect(moved.equals(Position.of(2, 1, 3))).toBe(true);
    // original unchanged (immutable)
    expect(p.equals(Position.of(1, 2, 3))).toBe(true);
  });

  it('translates rejects non-finite deltas', () => {
    const p = Position.of(1, 2, 3);
    expect(() => p.translate([NaN, 0, 0])).toThrow(/finite/);
  });

  it('exposes a tuple form for serialization', () => {
    expect(Position.of(1.5, 2.5, 3.5).toTuple()).toEqual([1.5, 2.5, 3.5]);
  });

  it('type guard accepts only Position instances', () => {
    expect(isPosition(Position.of(0, 0, 0))).toBe(true);
    expect(isPosition({ x: 0, y: 0, z: 0 })).toBe(false);
    expect(isPosition(null)).toBe(false);
    expect(isPosition(42)).toBe(false);
  });

  it('origin is a real value object', () => {
    const o = Position.origin();
    expect(o.x).toBe(0);
    expect(o.y).toBe(0);
    expect(o.z).toBe(0);
    expect(o.equals(Position.of(0, 0, 0))).toBe(true);
  });
});
