import { Position } from '@domain/value-objects/position';

/**
 * Test double for the Three.js renderer adapter.
 * Records every call for assertions.
 */
export class InMemoryRenderer {
  spy = {
    transforms: new Map<string, [number, number, number]>(),
    renders: 0,
  };

  setTransform(handle: string, position: Position): void {
    this.spy.transforms.set(handle, position.toTuple());
  }

  render(): void {
    this.spy.renders++;
  }
}
