import { assertFinite } from '../utils/assert-finite';

export interface Score {
  readonly value: number;
}

export const Score = {
  of(value: number): Score {
    assertFinite(value, 'score');
    return Object.freeze({ value }) as Score;
  },

  zero(): Score {
    return Object.freeze({ value: 0 }) as Score;
  },
};

export function isScore(v: unknown): v is Score {
  return v instanceof Object && 'value' in v && typeof (v as Score).value === 'number';
}
