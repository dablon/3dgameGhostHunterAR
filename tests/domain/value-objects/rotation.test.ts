import { describe, it, expect } from 'vitest';
import { Rotation, identityRotation, isRotation } from '@domain/value-objects/rotation';

describe('Rotation (quaternion value object)', () => {
  it('identity has xyzw = (0,0,0,1)', () => {
    const r = identityRotation();
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.z).toBe(0);
    expect(r.w).toBe(1);
  });

  it('rejects non-finite components', () => {
    expect(() => Rotation.of(NaN, 0, 0, 1)).toThrow(/finite/);
    expect(() => Rotation.of(0, 0, 0, Infinity)).toThrow(/finite/);
  });

  it('is frozen at runtime', () => {
    const r = identityRotation();
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('equals by structural value', () => {
    expect(identityRotation().equals(identityRotation())).toBe(true);
    expect(Rotation.of(0.1, 0.2, 0.3, 0.9).equals(Rotation.of(0.1, 0.2, 0.3, 0.9))).toBe(true);
    expect(identityRotation().equals(Rotation.of(0.1, 0, 0, 0.99))).toBe(false);
  });

  it('type guard accepts only Rotation', () => {
    expect(isRotation(identityRotation())).toBe(true);
    expect(isRotation({ x: 0, y: 0, z: 0, w: 1 })).toBe(false);
    expect(isRotation(null)).toBe(false);
  });

  it('toTuple serializes as xyzw', () => {
    const r = Rotation.of(0, 0, 0, 1);
    expect(r.toTuple()).toEqual([0, 0, 0, 1]);
  });
});
