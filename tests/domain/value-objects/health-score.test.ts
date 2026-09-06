import { describe, it, expect } from 'vitest';
import { Health, isHealth, Score, isScore } from '@domain';

describe('Health (value object)', () => {
  it('creates frozen health with a default max of 100', () => {
    const h = Health.of(50);
    expect(h).toEqual({ current: 50, max: 100 });
    expect(Object.isFrozen(h)).toBe(true);
  });

  it('creates full health', () => {
    expect(Health.full(75)).toEqual({ current: 75, max: 75 });
  });

  it('rejects non-finite values', () => {
    expect(() => Health.of(Number.NaN)).toThrow();
    expect(() => Health.of(Infinity)).toThrow();
    expect(() => Health.full(Number.NaN)).toThrow();
  });

  it('take never drops below zero', () => {
    const h = Health.take(Health.full(100), 150);
    expect(h.current).toBe(0);
  });

  it('heal never exceeds max', () => {
    const h = Health.heal(Health.of(90, 100), 50);
    expect(h.current).toBe(100);
  });

  it('detects death', () => {
    expect(Health.isDead(Health.of(0, 100))).toBe(true);
    expect(Health.isDead(Health.of(1, 100))).toBe(false);
  });

  it('isHealth guards malformed input', () => {
    expect(isHealth({ current: 1, max: 2 })).toBe(true);
    expect(isHealth({ current: 'x', max: 2 })).toBe(false);
    expect(isHealth(null)).toBe(false);
  });
});

describe('Score (value object)', () => {
  it('creates a frozen score', () => {
    const s = Score.of(42);
    expect(s.value).toBe(42);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('creates a zero score', () => {
    expect(Score.zero().value).toBe(0);
  });

  it('rejects non-finite values', () => {
    expect(() => Score.of(Number.NaN)).toThrow();
    expect(() => Score.of(Infinity)).toThrow();
  });

  it('isScore guards malformed input', () => {
    expect(isScore({ value: 1 })).toBe(true);
    expect(isScore({ value: 'x' })).toBe(false);
    expect(isScore(undefined)).toBe(false);
  });
});
