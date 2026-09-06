export const assertFinite = (v: number, label: string): void => {
  if (!Number.isFinite(v)) {
    throw new Error(`${label} must be a finite number, got ${v}`);
  }
};

export const assertFiniteTuple3 = (
  [x, y, z]: readonly [number, number, number],
  label: string,
): void => {
  assertFinite(x, `${label}.x`);
  assertFinite(y, `${label}.y`);
  assertFinite(z, `${label}.z`);
};
