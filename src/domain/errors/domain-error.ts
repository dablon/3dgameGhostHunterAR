export class DomainError extends Error {
  constructor(
    message: string,
    public readonly kind: string,
  ) {
    super(message);
    this.name = kind;
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityId: number) {
    super(`Entity ${entityId} not found`, 'EntityNotFoundError');
  }
}

export class DuplicateEntityError extends DomainError {
  constructor(entityId: number) {
    super(`Entity id ${entityId} already exists`, 'DuplicateEntityError');
  }
}

export class ComponentNotFoundError extends DomainError {
  constructor(entityId: number, component: string) {
    super(`Component '${component}' not found on entity ${entityId}`, 'ComponentNotFoundError');
  }
}
