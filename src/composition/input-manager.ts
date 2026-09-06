export interface InputState {
  keys: Set<string>;
  mouse: { x: number; y: number; dx: number; dy: number };
  leftMouseDown: boolean;
  rightMouseDown: boolean;
  pointerLocked: boolean;
}

export class InputManager {
  private state: InputState = {
    keys: new Set(),
    mouse: { x: 0, y: 0, dx: 0, dy: 0 },
    leftMouseDown: false,
    rightMouseDown: false,
    pointerLocked: false,
  };

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      this.state.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.state.keys.delete(e.code);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.state.leftMouseDown = true;
        this.tryRequestPointerLock();
      }
      if (e.button === 2) this.state.rightMouseDown = true;
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.state.leftMouseDown = false;
      if (e.button === 2) this.state.rightMouseDown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.state.mouse.dx = e.movementX;
      this.state.mouse.dy = e.movementY;
      this.state.mouse.x = e.clientX;
      this.state.mouse.y = e.clientY;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.state.pointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  isKeyDown(code: string): boolean {
    return this.state.keys.has(code);
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    const d = { dx: this.state.mouse.dx, dy: this.state.mouse.dy };
    this.state.mouse.dx = 0;
    this.state.mouse.dy = 0;
    return d;
  }

  tryRequestPointerLock(): void {
    if (!this.state.pointerLocked) {
      this.canvas.requestPointerLock();
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', () => {});
    window.removeEventListener('keyup', () => {});
  }
}
