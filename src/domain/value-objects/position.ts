import { assertFinite } from '../utils/assert-finite';

export interface Position {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Returns [x, y, z]. */
  toTuple(): [number, number, number];
  /** Returns a new position translated by [dx, dy, dz]. */
  translate(delta: readonly [number, number, number]): Position;
  /** Structural equality check. */
  equals(other: Position): boolean;
}

function makePosition(x: number, y: number, z: number): Position {
  const tuple: [number, number, number] = [x, y, z];
  const frozen = Object.freeze({
    x, y, z,
    toTuple() { return tuple; },
    translate(delta: readonly [number, number, number]) {
      assertFinite(delta[0], 'delta[0]');
      assertFinite(delta[1], 'delta[1]');
      assertFinite(delta[2], 'delta[2]');
      return makePosition(x + delta[0], y + delta[1], z + delta[2]);
    },
    equals(other: Position) {
      return other.x === x && other.y === y && other.z === z;
    },
  });
  return frozen as Position;
}

export function isPosition(v: unknown): v is Position {
  return (
    v != null &&
    typeof v === 'object' &&
    'x' in v &&
    'y' in v &&
    'z' in v &&
    'toTuple' in v &&
    'translate' in v &&
    'equals' in v &&
    typeof (v as Position).x === 'number' &&
    typeof (v as Position).y === 'number' &&
    typeof (v as Position).z === 'number' &&
    typeof (v as Position).toTuple === 'function' &&
    typeof (v as Position).translate === 'function' &&
    typeof (v as Position).equals === 'function'
  );
}

export const Position = {
  of(x: number, y: number, z: number): Position {
    assertFinite(x, 'position.x');
    assertFinite(y, 'position.y');
    assertFinite(z, 'position.z');
    return makePosition(x, y, z);
  },

  fromTuple(t: readonly [number, number, number]): Position {
    return Position.of(t[0], t[1], t[2]);
  },

  origin(): Position {
    return makePosition(0, 0, 0);
  },

  zero(): Position {
    return Position.origin();
  },
};
