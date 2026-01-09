import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClockController } from '../clock-controller';

describe('ClockController', () => {
  let controller: ClockController;

  beforeEach(() => {
    controller = new ClockController();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should start with clock low', () => {
      const state = controller.getState();
      expect(state.clockState).toBe(false);
    });

    it('should start paused (not running)', () => {
      const state = controller.getState();
      expect(state.isRunning).toBe(false);
    });

    it('should have default frequency of 1 Hz', () => {
      const state = controller.getState();
      expect(state.frequency).toBe(1);
    });

    it('should start with instruction count of 0', () => {
      const state = controller.getState();
      expect(state.instructionCount).toBe(0);
    });
  });

  describe('step()', () => {
    it('should generate one clock pulse (low→high→low)', () => {
      const clockChanges: boolean[] = [];
      controller.setOnClockChange((state) => clockChanges.push(state));

      controller.step();

      // Immediate: rising edge (low → high)
      expect(clockChanges[0]).toBe(true);
      expect(controller.getState().clockState).toBe(true);

      // After 50ms: falling edge (high → low)
      vi.advanceTimersByTime(50);
      expect(clockChanges[1]).toBe(false);
      expect(controller.getState().clockState).toBe(false);
    });

    it('should increment instruction count', () => {
      controller.step();
      expect(controller.getState().instructionCount).toBe(1);

      vi.advanceTimersByTime(50);
      controller.step();
      expect(controller.getState().instructionCount).toBe(2);
    });

    it('should not step while running', () => {
      const clockChanges: boolean[] = [];
      controller.setOnClockChange((state) => clockChanges.push(state));

      controller.run();
      controller.step(); // Should be ignored

      expect(clockChanges.length).toBe(0); // No manual step occurred
    });
  });

  describe('run()', () => {
    it('should start automatic pulsing', () => {
      controller.run();
      expect(controller.getState().isRunning).toBe(true);
    });

    it('should generate periodic clock pulses at 1 Hz', () => {
      const clockChanges: boolean[] = [];
      controller.setOnClockChange((state) => clockChanges.push(state));

      controller.setFrequency(1); // 1 Hz = 1 pulse per second
      controller.run();

      // First pulse at t=0
      vi.advanceTimersByTime(0);
      expect(clockChanges.length).toBe(0); // No immediate pulse

      // First pulse at t=1000ms
      vi.advanceTimersByTime(1000);
      expect(clockChanges[0]).toBe(true); // Rising edge

      vi.advanceTimersByTime(50);
      expect(clockChanges[1]).toBe(false); // Falling edge

      // Second pulse at t=2000ms
      vi.advanceTimersByTime(950); // 1000ms total for next pulse
      expect(clockChanges[2]).toBe(true); // Rising edge

      vi.advanceTimersByTime(50);
      expect(clockChanges[3]).toBe(false); // Falling edge
    });

    it('should generate pulses at correct frequency (2 Hz)', () => {
      const clockChanges: boolean[] = [];
      controller.setOnClockChange((state) => clockChanges.push(state));

      controller.setFrequency(2); // 2 Hz = 2 pulses per second = 500ms period
      controller.run();

      // First pulse at t=500ms
      vi.advanceTimersByTime(500);
      expect(clockChanges[0]).toBe(true);

      vi.advanceTimersByTime(50);
      expect(clockChanges[1]).toBe(false);

      // Second pulse at t=1000ms
      vi.advanceTimersByTime(450);
      expect(clockChanges[2]).toBe(true);
    });

    it('should increment instruction count on each pulse', () => {
      controller.setFrequency(1);
      controller.run();

      expect(controller.getState().instructionCount).toBe(0);

      vi.advanceTimersByTime(1000);
      expect(controller.getState().instructionCount).toBe(1);

      vi.advanceTimersByTime(1000);
      expect(controller.getState().instructionCount).toBe(2);
    });

    it('should not start if already running', () => {
      controller.run();
      const state1 = controller.getState();

      controller.run(); // Second call should be ignored
      const state2 = controller.getState();

      expect(state1).toEqual(state2);
    });
  });

  describe('pause()', () => {
    it('should stop automatic pulsing', () => {
      const clockChanges: boolean[] = [];
      controller.setOnClockChange((state) => clockChanges.push(state));

      controller.run();
      vi.advanceTimersByTime(1000);
      expect(clockChanges.length).toBe(1); // One rising edge

      controller.pause();
      expect(controller.getState().isRunning).toBe(false);

      // No more pulses after pause
      vi.advanceTimersByTime(10000);
      expect(clockChanges.length).toBe(2); // Only falling edge from first pulse
    });

    it('should preserve instruction count', () => {
      controller.run();
      vi.advanceTimersByTime(3000);

      const countBeforePause = controller.getState().instructionCount;
      controller.pause();

      expect(controller.getState().instructionCount).toBe(countBeforePause);
    });

    it('should do nothing if not running', () => {
      controller.pause(); // Should not throw
      expect(controller.getState().isRunning).toBe(false);
    });
  });

  describe('reset()', () => {
    it('should stop automatic pulsing', () => {
      controller.run();
      controller.reset();

      expect(controller.getState().isRunning).toBe(false);
    });

    it('should reset clock state to low', () => {
      controller.step();
      expect(controller.getState().clockState).toBe(true);

      controller.reset();
      expect(controller.getState().clockState).toBe(false);
    });

    it('should reset instruction count to 0', () => {
      controller.run();
      vi.advanceTimersByTime(3000);
      expect(controller.getState().instructionCount).toBeGreaterThan(0);

      controller.reset();
      expect(controller.getState().instructionCount).toBe(0);
    });

    it('should invoke reset callback', () => {
      const resetCallback = vi.fn();
      controller.setOnReset(resetCallback);

      controller.reset();

      expect(resetCallback).toHaveBeenCalledOnce();
    });

    it('should set clock to low via clock change callback', () => {
      const clockChanges: boolean[] = [];
      controller.setOnClockChange((state) => clockChanges.push(state));

      controller.reset();

      expect(clockChanges[clockChanges.length - 1]).toBe(false);
    });
  });

  describe('setFrequency()', () => {
    it('should update frequency', () => {
      controller.setFrequency(5);
      expect(controller.getState().frequency).toBe(5);
    });

    it('should restart pulsing with new frequency if running', () => {
      const clockChanges: boolean[] = [];
      controller.setOnClockChange((state) => clockChanges.push(state));

      controller.setFrequency(1); // 1 Hz = 1000ms period
      controller.run();

      vi.advanceTimersByTime(500);

      // Change to 2 Hz (500ms period) while running
      controller.setFrequency(2);

      // Should pulse at new frequency
      vi.advanceTimersByTime(500);
      expect(clockChanges[0]).toBe(true); // First pulse at new frequency
    });

    it('should clamp frequency to minimum 0.1 Hz', () => {
      controller.setFrequency(0.05);
      expect(controller.getState().frequency).toBe(0.1);
    });

    it('should clamp frequency to maximum 10 Hz', () => {
      controller.setFrequency(100);
      expect(controller.getState().frequency).toBe(10);
    });

    it('should not affect frequency if paused', () => {
      controller.setFrequency(5);
      expect(controller.getState().frequency).toBe(5);
      expect(controller.getState().isRunning).toBe(false);
    });
  });

  describe('Callbacks', () => {
    it('should invoke clock change callback on step', () => {
      const callback = vi.fn();
      controller.setOnClockChange(callback);

      controller.step();
      expect(callback).toHaveBeenCalledWith(true);

      vi.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should invoke clock change callback on run', () => {
      const callback = vi.fn();
      controller.setOnClockChange(callback);

      controller.run();
      vi.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should work without callbacks set', () => {
      expect(() => {
        controller.step();
        vi.advanceTimersByTime(50);
        controller.run();
        vi.advanceTimersByTime(1000);
        controller.reset();
      }).not.toThrow();
    });
  });
});
