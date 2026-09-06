import { assertFinite } from '../utils/assert-finite';

export interface HalfExtents {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Structural equality check. */
  equals(other: HalfExtents): boolean;
}

export const HalfExtents = {
  of(x: number, y: number, z: number): HalfExtents {
    if (x <= 0 || y <= 0 || z <= 0) {
      throw new Error('HalfExtents components must be positive');
    }
    assertFinite(x, 'halfExtents.x');
    assertFinite(y, 'halfExtents.y');
    assertFinite(z, 'halfExtents.z');
    return Object.freeze({ x, y, z, equals: (o: HalfExtents) => o.x === x && o.y === y && o.z === z }) as HalfExtents;
  },

  cube(s: number): HalfExtents {
    if (s <= 0) throw new Error('HalfExtents cube size must be positive');
    return HalfExtents.of(s, s, s);
  },
};

export function isHalfExtents(v: unknown): v is HalfExtents {
  return (
    v != null &&
    typeof v === 'object' &&
    'x' in v &&
    'y' in v &&
    'z' in v &&
    'equals' in v &&
    typeof (v as HalfExtents).x === 'number' &&
    typeof (v as HalfExtents).y === 'number' &&
    typeof (v as HalfExtents).z === 'number' &&
    typeof (v as HalfExtents).equals === 'function'
  );
}
