import { describe, it, expect } from 'vitest';
import { Velocity } from '@domain/value-objects/velocity';

describe('Velocity (value object)', () => {
  it('creates from finite numbers', () => {
    const v = Velocity.of(1, -2, 3);
    expect(v.x).toBe(1);
    expect(v.y).toBe(-2);
    expect(v.z).toBe(3);
  });

  it('rejects non-finite numbers', () => {
    expect(() => Velocity.of(NaN, 0, 0)).toThrow(/finite/);
  });

  it('zero is the additive identity', () => {
    const z = Velocity.zero();
    const v = Velocity.of(3, 4, 5);
    expect(z.add(v).equals(v)).toBe(true);
    expect(v.add(z).equals(v)).toBe(true);
  });

  it('add is commutative and pure', () => {
    const a = Velocity.of(1, 2, 3);
    const b = Velocity.of(10, 20, 30);
    expect(a.add(b).equals(b.add(a))).toBe(true);
    expect(a.equals(Velocity.of(1, 2, 3))).toBe(true); // original unchanged
  });

  it('scale by a finite scalar', () => {
    const v = Velocity.of(2, 3, 4);
    expect(v.scale(2).equals(Velocity.of(4, 6, 8))).toBe(true);
    expect(() => v.scale(NaN)).toThrow(/finite/);
  });
});
