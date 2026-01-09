import { useMemo } from 'react';
import { BreadboardController, createInitialState } from '@/ui-controller';
import { BreadboardScene } from './BreadboardScene';
import { ComponentType } from '@/core/types';
import type { Resistor, LED, PowerSupply, Ground } from '@/core/types';

export default function App() {
  const controller = useMemo(() => {
    const initialState = createInitialState();
    
    // Add test components for demonstration
    const testComponents = [
      // Resistor (220Ω) spanning 2 holes
      {
        id: 'test-resistor-1',
        type: ComponentType.RESISTOR,
        resistance: 220,
        positions: [{ row: 5, col: 8 }, { row: 5, col: 9 }],
        rotation: 0,
      } as Resistor,
      
      // LED
      {
        id: 'test-led-1',
        type: ComponentType.LED,
        forwardVoltage: 2.0,
        maxCurrent: 0.02,
        positions: [{ row: 8, col: 8 }, { row: 8, col: 9 }],
        rotation: 0,
      } as LED,
      
      // Power supply
      {
        id: 'test-power-1',
        type: ComponentType.POWER_SUPPLY,
        voltage: 5,
        positions: [{ row: 2, col: 1 }, { row: 2, col: 2 }],
        rotation: 0,
      } as PowerSupply,
      
      // Ground
      {
        id: 'test-ground-1',
        type: ComponentType.GROUND,
        positions: [{ row: 12, col: 2 }],
        rotation: 0,
      } as Ground,
    ];
    
    // Add components to initial state
    initialState.breadboard.components = testComponents;
    
    return new BreadboardController(initialState);
  }, []);

  return <BreadboardScene controller={controller} />;
}

