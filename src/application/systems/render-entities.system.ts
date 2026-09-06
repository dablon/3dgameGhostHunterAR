import type { World } from '@domain';
import type { VisualComponent, TransformComponent } from '@domain/components';
import type { Position } from '@domain';

interface Renderer {
  setTransform(handle: string, position: Position): void;
  render(): void;
}

/**
 * Pushes every entity with visual + transform components into the renderer.
 * Calls render() once per invocation.
 */
export function renderEntities(world: World, renderer: Renderer): void {
  for (const id of world.query(['visual', 'transform'])) {
    const comp = world.get(id);
    const visual = comp.visual as VisualComponent;
    const transform = comp.transform as TransformComponent;
    renderer.setTransform(visual.handle, transform.position);
  }
  renderer.render();
}
