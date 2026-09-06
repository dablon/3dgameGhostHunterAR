import { assertFinite } from '../utils/assert-finite';

export interface Rotation {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  /** Returns [x, y, z, w]. */
  toTuple(): [number, number, number, number];
  /** Structural equality check. */
  equals(other: Rotation): boolean;
}

function makeRotation(x: number, y: number, z: number, w: number): Rotation {
  const tuple: [number, number, number, number] = [x, y, z, w];
  return Object.freeze({
    x, y, z, w,
    toTuple() { return tuple; },
    equals(other: Rotation) {
      return other.x === x && other.y === y && other.z === z && other.w === w;
    },
  }) as Rotation;
}

export const Rotation = {
  of(x: number, y: number, z: number, w: number): Rotation {
    assertFinite(x, 'rotation.x');
    assertFinite(y, 'rotation.y');
    assertFinite(z, 'rotation.z');
    assertFinite(w, 'rotation.w');
    return makeRotation(x, y, z, w);
  },

  identity(): Rotation {
    return makeRotation(0, 0, 0, 1);
  },
};

/** Identity quaternion — callable to get (0,0,0,1). */
export function identityRotation(): Rotation {
  return makeRotation(0, 0, 0, 1);
}

export function isRotation(v: unknown): v is Rotation {
  return (
    v != null &&
    typeof v === 'object' &&
    'x' in v &&
    'y' in v &&
    'z' in v &&
    'w' in v &&
    'toTuple' in v &&
    'equals' in v &&
    typeof (v as Rotation).x === 'number' &&
    typeof (v as Rotation).y === 'number' &&
    typeof (v as Rotation).z === 'number' &&
    typeof (v as Rotation).w === 'number' &&
    typeof (v as Rotation).toTuple === 'function' &&
    typeof (v as Rotation).equals === 'function'
  );
}
