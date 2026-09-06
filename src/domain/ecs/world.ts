import { EntityNotFoundError, DuplicateEntityError } from '../errors/domain-error';

export type EntityId = number;

export type EntityRecord = Record<string, unknown>;

export type DomainEvent =
  | { kind: 'entityAdded'; entityId: EntityId }
  | { kind: 'entityUpdated'; entityId: EntityId }
  | { kind: 'entityRemoved'; entityId: EntityId };

type EventListener = (event: DomainEvent) => void;

export class World {
  private _nextId: EntityId = 1;
  private _entities: Map<EntityId, EntityRecord> = new Map();
  private _dead: Set<EntityId> = new Set();
  private _listeners: Set<EventListener> = new Set();

  get size(): number {
    return this._entities.size;
  }

  addEntity(components: EntityRecord, id?: EntityId): EntityId {
    const eid = id ?? this._nextId++;
    if (this._entities.has(eid)) {
      throw new DuplicateEntityError(eid);
    }
    this._entities.set(eid, { ...components });
    this._emit({ kind: 'entityAdded', entityId: eid });
    return eid;
  }

  /** Returns the full component record for an entity. */
  get<T extends EntityRecord = EntityRecord>(id: EntityId): T {
    const e = this._entities.get(id);
    if (!e || this._dead.has(id)) {
      throw new EntityNotFoundError(id);
    }
    return e as T;
  }

  set(id: EntityId, components: Partial<EntityRecord>): void {
    if (!this._entities.has(id) || this._dead.has(id)) {
      throw new EntityNotFoundError(id);
    }
    const existing = this._entities.get(id)!;
    this._entities.set(id, { ...existing, ...components });
    this._emit({ kind: 'entityUpdated', entityId: id });
  }

  removeEntity(id: EntityId): void {
    if (!this._entities.has(id)) {
      throw new EntityNotFoundError(id);
    }
    this._dead.add(id);
    this._emit({ kind: 'entityRemoved', entityId: id });
  }

  flush(): void {
    for (const id of this._dead) {
      this._entities.delete(id);
    }
    this._dead.clear();
  }

  isAlive(id: EntityId): boolean {
    return this._entities.has(id) && !this._dead.has(id);
  }

  query(components: string[]): EntityId[] {
    const result: EntityId[] = [];
    for (const [id, record] of this._entities) {
      if (this._dead.has(id)) continue;
      if (components.every((c) => c in record)) {
        result.push(id);
      }
    }
    return result;
  }

  forEach(fn: (id: EntityId, record: EntityRecord) => void): void {
    for (const [id, record] of this._entities) {
      if (!this._dead.has(id)) {
        fn(id, record);
      }
    }
  }

  clear(): void {
    this._entities.clear();
    this._dead.clear();
    this._nextId = 1;
  }

  onEvent(listener: EventListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _emit(event: DomainEvent): void {
    for (const listener of this._listeners) {
      listener(event);
    }
  }
}
