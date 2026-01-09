import { describe, it, expect } from 'vitest';
import { serializeCircuit, deserializeCircuit } from '../circuit-serializer';
import { ComponentType } from '../types';
import type { BreadboardState } from '../types';

describe('Switch Serialization', () => {
  it('should serialize switch component with state', () => {
    const state: BreadboardState = {
      components: [
        {
          id: 'switch-1',
          type: ComponentType.SWITCH,
          positions: [
            { row: 10, col: 5 },
            { row: 10, col: 6 },
          ],
          rotation: 0,
          switchState: 'closed',
        },
      ],
      selectedComponentId: null,
    };

    const json = serializeCircuit(state);
    const parsed = JSON.parse(json);

    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].type).toBe('SWITCH');
    expect(parsed.components[0].metadata.switchState).toBe('closed');
  });

  it('should deserialize switch component with state', () => {
    const json = JSON.stringify({
      version: '1.0',
      metadata: {
        name: 'Test Circuit',
        created: new Date().toISOString(),
      },
      components: [
        {
          id: 'switch-1',
          type: 'SWITCH',
          positions: [
            { row: 10, col: 5 },
            { row: 10, col: 6 },
          ],
          rotation: 0,
          metadata: {
            switchState: 'closed',
          },
        },
      ],
    });

    const { state } = deserializeCircuit(json);

    expect(state.components).toHaveLength(1);
    expect(state.components[0].type).toBe(ComponentType.SWITCH);
    if (state.components[0].type === ComponentType.SWITCH) {
      expect(state.components[0].switchState).toBe('closed');
    }
  });

  it('should default to open state when switchState is missing', () => {
    const json = JSON.stringify({
      version: '1.0',
      metadata: {
        name: 'Test Circuit',
        created: new Date().toISOString(),
      },
      components: [
        {
          id: 'switch-1',
          type: 'SWITCH',
          positions: [
            { row: 10, col: 5 },
            { row: 10, col: 6 },
          ],
          rotation: 0,
          metadata: {},
        },
      ],
    });

    const { state } = deserializeCircuit(json);

    expect(state.components).toHaveLength(1);
    if (state.components[0].type === ComponentType.SWITCH) {
      expect(state.components[0].switchState).toBe('open');
    }
  });

  it('should serialize and deserialize open switch state', () => {
    const originalState: BreadboardState = {
      components: [
        {
          id: 'switch-1',
          type: ComponentType.SWITCH,
          positions: [
            { row: 5, col: 10 },
            { row: 5, col: 11 },
          ],
          rotation: 90,
          switchState: 'open',
        },
      ],
      selectedComponentId: null,
    };

    const json = serializeCircuit(originalState);
    const { state: deserializedState } = deserializeCircuit(json);

    expect(deserializedState.components).toHaveLength(1);
    const component = deserializedState.components[0];
    expect(component.type).toBe(ComponentType.SWITCH);
    if (component.type === ComponentType.SWITCH) {
      expect(component.switchState).toBe('open');
      expect(component.rotation).toBe(90);
    }
  });
});
