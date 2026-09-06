import { assertFinite } from '../utils/assert-finite';

export interface Health {
  readonly current: number;
  readonly max: number;
}

export const Health = {
  of(current: number, max = 100): Health {
    assertFinite(current, 'health.current');
    assertFinite(max, 'health.max');
    return Object.freeze({ current, max }) as Health;
  },

  full(max = 100): Health {
    assertFinite(max, 'health.max');
    return Object.freeze({ current: max, max }) as Health;
  },

  take(h: Health, amount: number): Health {
    const next = Math.max(0, h.current - amount);
    return Object.freeze({ current: next, max: h.max }) as Health;
  },

  heal(h: Health, amount: number): Health {
    const next = Math.min(h.max, h.current + amount);
    return Object.freeze({ current: next, max: h.max }) as Health;
  },

  isDead(h: Health): boolean {
    return h.current <= 0;
  },
};

export function isHealth(v: unknown): v is Health {
  return (
    v instanceof Object &&
    'current' in v &&
    'max' in v &&
    typeof (v as Health).current === 'number' &&
    typeof (v as Health).max === 'number'
  );
}
