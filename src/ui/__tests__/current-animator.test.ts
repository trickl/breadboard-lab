import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CurrentAnimator } from '../current-animator';
import { ComponentType } from '@/core/types';
import type { SimulationResult, AnyComponent } from '@/core/types';

describe('CurrentAnimator', () => {
  let animator: CurrentAnimator;
  let mockSvg: SVGElement;

  beforeEach(() => {
    animator = new CurrentAnimator();
    mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(mockSvg);
  });

  afterEach(() => {
    animator.stop();
    if (mockSvg && mockSvg.parentNode) {
      mockSvg.parentNode.removeChild(mockSvg);
    }
  });

  describe('start and stop', () => {
    it('should not start animation if simulation failed', () => {
      const failedResult: SimulationResult = {
        success: false,
        error: 'Test error',
        nodeVoltages: new Map(),
        edgeCurrents: new Map(),
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          resistance: 0.01,
        },
      ];

      animator.start(failedResult, components, mockSvg);

      // Should not create any particle groups
      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).toBeNull();
    });

    it('should not create particles for current below threshold', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([
          ['node1', 5],
          ['node2', 0],
        ]),
        edgeCurrents: new Map([
          ['wire1', 1e-7], // 0.1µA - below 1µA threshold
        ]),
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          resistance: 0.01,
        },
      ];

      animator.start(result, components, mockSvg);

      // Wait a moment for animation to potentially render
      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).toBeNull();
    });

    it('should create particles for current above threshold', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([
          ['node1', 5],
          ['node2', 0],
        ]),
        edgeCurrents: new Map([
          ['wire1', 0.005], // 5mA - well above threshold
        ]),
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 5 },
          ],
          resistance: 0.01,
        },
      ];

      // Mock requestAnimationFrame to NOT call the callback (avoid infinite loop in tests)
      let animationFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        return ++animationFrameId;
      });

      animator.start(result, components, mockSvg);

      // Check that particle group was created
      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).not.toBeNull();
    });

    it('should clean up on stop', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([['node1', 5]]),
        edgeCurrents: new Map([['wire1', 0.005]]),
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          resistance: 0.01,
        },
      ];

      let animationFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        return ++animationFrameId;
      });

      animator.start(result, components, mockSvg);
      animator.stop();

      // Particle group should be removed
      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).toBeNull();
    });
  });

  describe('current magnitude scaling', () => {
    it('should create more particles for higher current', () => {
      // Test with low current (< 1mA)
      const lowCurrentResult: SimulationResult = {
        success: true,
        nodeVoltages: new Map([['node1', 5]]),
        edgeCurrents: new Map([['wire1', 0.0005]]), // 0.5mA
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 5 },
          ],
          resistance: 0.01,
        },
      ];

      let animationFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        return ++animationFrameId;
      });

      animator.start(lowCurrentResult, components, mockSvg);

      const lowCurrentParticles = mockSvg.querySelectorAll(
        '.current-particles circle'
      ).length;

      animator.stop();

      // Test with high current (> 10mA)
      const highCurrentResult: SimulationResult = {
        success: true,
        nodeVoltages: new Map([['node1', 5]]),
        edgeCurrents: new Map([['wire1', 0.015]]), // 15mA
      };

      animator.start(highCurrentResult, components, mockSvg);

      const highCurrentParticles = mockSvg.querySelectorAll(
        '.current-particles circle'
      ).length;

      // High current should have more particles than low current
      expect(highCurrentParticles).toBeGreaterThan(lowCurrentParticles);
    });
  });

  describe('component types', () => {
    it('should handle wire components', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([
          ['node1', 5],
          ['node2', 0],
        ]),
        edgeCurrents: new Map([['wire1', 0.005]]),
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 5, col: 5 },
          ],
          resistance: 0.01,
        },
      ];

      let animationFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        return ++animationFrameId;
      });

      animator.start(result, components, mockSvg);

      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).not.toBeNull();
      expect(particleGroup?.children.length).toBeGreaterThan(0);
    });

    it('should handle resistor components', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([
          ['node1', 5],
          ['node2', 0],
        ]),
        edgeCurrents: new Map([['resistor1', 0.005]]),
      };

      const components: AnyComponent[] = [
        {
          id: 'resistor1',
          type: ComponentType.RESISTOR,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 5 },
          ],
          resistance: 1000,
        },
      ];

      let animationFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        return ++animationFrameId;
      });

      animator.start(result, components, mockSvg);

      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).not.toBeNull();
    });

    it('should handle LED components', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([
          ['node1', 5],
          ['node2', 3],
        ]),
        edgeCurrents: new Map([['led1', 0.010]]),
      };

      const components: AnyComponent[] = [
        {
          id: 'led1',
          type: ComponentType.LED,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 5 },
          ],
          forwardVoltage: 2.0,
          maxCurrent: 0.02,
        },
      ];

      let animationFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        return ++animationFrameId;
      });

      animator.start(result, components, mockSvg);

      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty component list', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map(),
        edgeCurrents: new Map(),
      };

      animator.start(result, [], mockSvg);

      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).toBeNull();
    });

    it('should handle zero current', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([
          ['node1', 0],
          ['node2', 0],
        ]),
        edgeCurrents: new Map([['wire1', 0]]),
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          resistance: 0.01,
        },
      ];

      animator.start(result, components, mockSvg);

      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).toBeNull();
    });

    it('should handle negative current (reversed flow)', () => {
      const result: SimulationResult = {
        success: true,
        nodeVoltages: new Map([
          ['node1', 0],
          ['node2', 5],
        ]),
        edgeCurrents: new Map([['wire1', -0.005]]), // Negative current
      };

      const components: AnyComponent[] = [
        {
          id: 'wire1',
          type: ComponentType.WIRE,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 5 },
          ],
          resistance: 0.01,
        },
      ];

      let animationFrameId = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        return ++animationFrameId;
      });

      animator.start(result, components, mockSvg);

      // Should still create particles (just flowing in reverse direction)
      const particleGroup = mockSvg.querySelector('.current-particles');
      expect(particleGroup).not.toBeNull();
    });
  });
});
