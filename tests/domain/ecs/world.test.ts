import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import { EntityNotFoundError, DuplicateEntityError } from '@domain/errors/domain-error';

describe('World (aggregate root)', () => {
  it('mints unique ids on addEntity', () => {
    const w = new World();
    const a = w.addEntity({ kind: 'transform' });
    const b = w.addEntity({ kind: 'transform' });
    expect(a).not.toBe(b);
    expect(w.size).toBe(2);
  });

  it('returns the components stored on an entity', () => {
    const w = new World();
    const id = w.addEntity({ kind: 'transform', x: 1, y: 2 });
    expect(w.get(id)).toEqual({ kind: 'transform', x: 1, y: 2 });
  });

  it('throws EntityNotFound when reading a missing id', () => {
    const w = new World();
    expect(() => w.get(999)).toThrow(EntityNotFoundError);
  });

  it('throws DuplicateEntity when adding an id that already exists', () => {
    const w = new World();
    w.addEntity({ kind: 'foo' }, 7);
    expect(() => w.addEntity({ kind: 'bar' }, 7)).toThrow(DuplicateEntityError);
  });

  it('merges components on set()', () => {
    const w = new World();
    const id = w.addEntity({ kind: 'transform', x: 1 });
    w.set(id, { y: 2 });
    expect(w.get(id)).toEqual({ kind: 'transform', x: 1, y: 2 });
  });

  it('throws EntityNotFound on set() with unknown id', () => {
    const w = new World();
    expect(() => w.set(123, { kind: 'x' })).toThrow(EntityNotFoundError);
  });

  it('removeEntity is a two-phase operation (deferred until flush)', () => {
    const w = new World();
    const a = w.addEntity({ kind: 'a' });
    const b = w.addEntity({ kind: 'b' });
    w.removeEntity(a);
    expect(w.size).toBe(2); // still alive until flush
    expect(w.isAlive(a)).toBe(false);
    expect(w.isAlive(b)).toBe(true);
    w.flush();
    expect(w.size).toBe(1);
  });

  it('flush() removes only dead entities', () => {
    const w = new World();
    const a = w.addEntity({ kind: 'a' });
    const b = w.addEntity({ kind: 'b' });
    const c = w.addEntity({ kind: 'c' });
    w.removeEntity(a);
    w.removeEntity(c);
    w.flush();
    expect(w.size).toBe(1);
    expect(w.isAlive(b)).toBe(true);
  });

  it('query returns ids whose components contain every required key', () => {
    const w = new World();
    w.addEntity({ kind: 'transform', health: 10 }, 1);
    w.addEntity({ kind: 'camera' }, 2);
    w.addEntity({ kind: 'transform', health: 99 }, 3);
    const r = w.query(['kind', 'health']);
    expect(r.sort()).toEqual([1, 3]);
  });

  it('forEach visits every live entity exactly once', () => {
    const w = new World();
    w.addEntity({ i: 1 }, 10);
    w.addEntity({ i: 2 }, 20);
    w.addEntity({ i: 3 }, 30);
    let count = 0;
    w.forEach(() => count++);
    expect(count).toBe(3);
  });

  it('forEach does not visit dead entities', () => {
    const w = new World();
    const a = w.addEntity({ i: 1 }, 1);
    w.addEntity({ i: 2 }, 2);
    w.removeEntity(a);
    w.flush();
    let count = 0;
    w.forEach(() => count++);
    expect(count).toBe(1);
  });

  it('clear() resets everything', () => {
    const w = new World();
    w.addEntity({ kind: 'a' }, 1);
    w.addEntity({ kind: 'b' }, 2);
    w.clear();
    expect(w.size).toBe(0);
    const id = w.addEntity({ kind: 'c' });
    expect(typeof id).toBe('number');
  });

  it('emits domain events on entity mutations', () => {
    const w = new World();
    const events: string[] = [];
    w.onEvent((e) => events.push(e.kind));
    w.addEntity({ kind: 'x' }, 1);
    w.set(1, { updated: true });
    const id = w.addEntity({ kind: 'y' }, 2);
    w.removeEntity(id);
    w.flush();
    expect(events).toEqual(['entityAdded', 'entityUpdated', 'entityAdded', 'entityRemoved']);
  });

  it('domain events carry the entity id', () => {
    const w = new World();
    const seen: number[] = [];
    w.onEvent((e) => seen.push(e.entityId));
    w.addEntity({ kind: 'x' }, 42);
    w.removeEntity(42);
    w.flush();
    expect(seen).toEqual([42, 42]);
  });

  it('listener unsubscribe stops events', () => {
    const w = new World();
    let count = 0;
    const off = w.onEvent(() => count++);
    w.addEntity({ kind: 'a' }, 1);
    off();
    w.addEntity({ kind: 'b' }, 2);
    expect(count).toBe(1);
  });
});
