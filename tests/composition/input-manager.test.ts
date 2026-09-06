// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { InputManager } from '@composition/input-manager';

function setup() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);

  let lockRequests = 0;
  (canvas as unknown as Record<string, unknown>).requestPointerLock = () => {
    lockRequests++;
  };

  const manager = new InputManager(canvas);
  return {
    manager,
    canvas,
    getLockRequests: () => lockRequests,
  };
}

function setPointerLockElement(el: Element | null): void {
  Object.defineProperty(document, 'pointerLockElement', {
    value: el,
    configurable: true,
  });
}

afterEach(() => {
  setPointerLockElement(null);
  document.body.innerHTML = '';
});

describe('InputManager (adapter)', () => {
  it('tracks keydown and keyup', () => {
    const { manager } = setup();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(manager.getState().keys.has('KeyW')).toBe(true);
    expect(manager.isKeyDown('KeyW')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(manager.isKeyDown('KeyW')).toBe(false);
  });

  it('tracks left mouse button and requests pointer lock on click', () => {
    const { manager, canvas, getLockRequests } = setup();

    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    expect(manager.getState().leftMouseDown).toBe(true);
    expect(getLockRequests()).toBe(1);

    canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(manager.getState().leftMouseDown).toBe(false);
  });

  it('tracks right mouse button without requesting pointer lock', () => {
    const { manager, canvas, getLockRequests } = setup();

    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
    expect(manager.getState().rightMouseDown).toBe(true);
    expect(getLockRequests()).toBe(0);
  });

  it('prevents the context menu on the canvas', () => {
    const { canvas } = setup();
    const event = new MouseEvent('contextmenu', { cancelable: true });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('consumeMouseDelta returns and resets the movement delta', () => {
    const { manager, canvas } = setup();

    canvas.dispatchEvent(
      new MouseEvent('mousemove', { movementX: 4, movementY: -2 } as MouseEventInit),
    );

    expect(manager.consumeMouseDelta()).toEqual({ dx: 4, dy: -2 });
    expect(manager.consumeMouseDelta()).toEqual({ dx: 0, dy: 0 });
  });

  it('reflects pointer lock state changes', () => {
    const { manager, canvas } = setup();

    setPointerLockElement(canvas);
    document.dispatchEvent(new Event('pointerlockchange'));
    expect(manager.getState().pointerLocked).toBe(true);

    setPointerLockElement(null);
    document.dispatchEvent(new Event('pointerlockchange'));
    expect(manager.getState().pointerLocked).toBe(false);
  });

  it('tryRequestPointerLock skips the request while already locked', () => {
    const { manager, canvas, getLockRequests } = setup();

    setPointerLockElement(canvas);
    document.dispatchEvent(new Event('pointerlockchange'));

    manager.tryRequestPointerLock();
    expect(getLockRequests()).toBe(0);
  });
});
