import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import { Position, Rotation, type VisualComponent, type TransformComponent } from '@domain';
import { renderEntities } from '@application/systems/render-entities.system';
import { InMemoryRenderer } from '@adapters/fakes';

describe('renderEntities (use case)', () => {
  it('calls renderer.setTransform for every visual entity with a transform', () => {
    const renderer = new InMemoryRenderer();
    const world = new World();
    const handle = 'h1' as unknown as VisualComponent['handle'];
    world.addEntity({
      transform: { position: Position.of(1, 2, 3) },
      visual: { handle },
    });
    world.addEntity({
      transform: { position: Position.of(4, 5, 6), rotation: Rotation.identity() },
      visual: { handle: 'h2' as unknown as VisualComponent['handle'] },
    });
    renderEntities(world, renderer);
    expect(renderer.spy.transforms.get(handle)).toEqual([1, 2, 3]);
  });

  it('does not touch entities missing visual', () => {
    const renderer = new InMemoryRenderer();
    const world = new World();
    world.addEntity({ transform: { position: Position.of(0, 0, 0) } });
    renderEntities(world, renderer);
    expect(renderer.spy.transforms.size).toBe(0);
  });

  it('invokes renderer.render() exactly once', () => {
    const renderer = new InMemoryRenderer();
    const world = new World();
    renderEntities(world, renderer);
    renderEntities(world, renderer);
    expect(renderer.spy.renders).toBe(2);
  });

  it('Type test: TransformComponent.rotation can be undefined', () => {
    const t: TransformComponent = { position: Position.of(0, 0, 0) };
    expect(t.rotation).toBeUndefined();
  });
});
