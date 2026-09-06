export interface InputSnapshot {
  down: Set<string>;
  pressed: Set<string>;
  mouse: { x: number; y: number };
  mouseDelta: { x: number; y: number };
  mouseButtons: Set<string>;
  mouseClicked: Set<string>;
  wheelDelta: number;
}

/**
 * Test double for the InputManager output.
 * Tests set `nextSnapshot` before calling the system under test.
 */
export class InMemoryInputSource {
  nextSnapshot: InputSnapshot = {
    down: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0 },
    mouseDelta: { x: 0, y: 0 },
    mouseButtons: new Set(),
    mouseClicked: new Set(),
    wheelDelta: 0,
  };

  getSnapshot(): InputSnapshot {
    return this.nextSnapshot;
  }
}
