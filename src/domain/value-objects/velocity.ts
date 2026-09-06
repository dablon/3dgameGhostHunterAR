import { assertFinite } from '../utils/assert-finite';

export interface Velocity {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Returns a new Velocity added to this one. */
  add(other: Velocity): Velocity;
  /** Returns a new Velocity scaled by the given factor. */
  scale(factor: number): Velocity;
  /** Structural equality check. */
  equals(other: Velocity): boolean;
}

function makeVelocity(x: number, y: number, z: number): Velocity {
  return Object.freeze({
    x, y, z,
    add(other: Velocity) {
      assertFinite(other.x, 'velocity.x');
      assertFinite(other.y, 'velocity.y');
      assertFinite(other.z, 'velocity.z');
      return makeVelocity(x + other.x, y + other.y, z + other.z);
    },
    scale(factor: number) {
      assertFinite(factor, 'scale');
      return makeVelocity(x * factor, y * factor, z * factor);
    },
    equals(other: Velocity) {
      return other.x === x && other.y === y && other.z === z;
    },
  });
}

export const Velocity = {
  of(x: number, y: number, z: number): Velocity {
    assertFinite(x, 'velocity.x');
    assertFinite(y, 'velocity.y');
    assertFinite(z, 'velocity.z');
    return makeVelocity(x, y, z);
  },

  zero(): Velocity {
    return makeVelocity(0, 0, 0);
  },
};

export function isVelocity(v: unknown): v is Velocity {
  return (
    v instanceof Object &&
    'x' in v &&
    'y' in v &&
    'z' in v &&
    typeof (v as Velocity).x === 'number' &&
    typeof (v as Velocity).y === 'number' &&
    typeof (v as Velocity).z === 'number'
  );
}

export function assertVelocity(v: unknown): asserts v is Velocity {
  if (!isVelocity(v)) {
    throw new Error('Expected Velocity');
  }
}
