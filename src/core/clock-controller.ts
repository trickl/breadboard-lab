/**
 * Clock Controller
 * 
 * Manages clock signal generation for digital components (e.g., EDU-8 microprocessor).
 * Supports manual stepping (one pulse at a time) and automatic pulsing at configurable frequencies.
 */

/**
 * Clock pulse callback - invoked when clock state changes
 * @param state true = high, false = low
 */
export type ClockChangeCallback = (state: boolean) => void;

/**
 * Reset callback - invoked when reset is triggered
 */
export type ResetCallback = () => void;

/**
 * Clock controller state
 */
export interface ClockControllerState {
  clockState: boolean; // Current clock level (false = low, true = high)
  isRunning: boolean; // Is automatic pulsing active?
  frequency: number; // Clock frequency in Hz
  instructionCount: number; // Number of instructions executed
}

/**
 * Clock Controller
 * 
 * Manages clock signal generation with:
 * - Manual stepping (execute one clock pulse on demand)
 * - Automatic pulsing (periodic clock pulses at configurable frequency)
 * - Reset capability (reinitialize microprocessor state)
 */
export class ClockController {
  private clockState: boolean = false; // false = low, true = high
  private isRunning: boolean = false;
  private frequency: number = 1; // Hz (default 1 Hz for educational visibility)
  private intervalId: number | null = null;
  private instructionCount: number = 0;
  
  private onClockChangeCallback?: ClockChangeCallback;
  private onResetCallback?: ResetCallback;
  
  /**
   * Execute one full clock pulse: low→high→low
   * 
   * This method:
   * 1. Sets clock high
   * 2. Notifies listeners (triggers instruction execution)
   * 3. After 50ms, sets clock low
   * 4. Notifies listeners again
   * 
   * The 50ms high pulse is chosen to be visible for debugging
   * but fast enough not to feel sluggish in the UI.
   */
  step(): void {
    if (this.isRunning) {
      return; // Don't allow manual stepping while auto-running
    }
    
    // Rising edge: low → high
    this.clockState = true;
    this.instructionCount++;
    if (this.onClockChangeCallback) {
      this.onClockChangeCallback(true);
    }
    
    // Falling edge: high → low (after 50ms)
    setTimeout(() => {
      this.clockState = false;
      if (this.onClockChangeCallback) {
        this.onClockChangeCallback(false);
      }
    }, 50);
  }
  
  /**
   * Start automatic clock pulsing at current frequency
   * 
   * Clock pulses are generated periodically at the specified frequency.
   * Each pulse executes one instruction on the microprocessor.
   */
  run(): void {
    if (this.isRunning) {
      return; // Already running
    }
    
    this.isRunning = true;
    const period = 1000 / this.frequency; // Period in milliseconds
    
    this.intervalId = window.setInterval(() => {
      this.executePulse();
    }, period);
  }
  
  /**
   * Stop automatic clock pulsing
   * 
   * Pauses execution but preserves microprocessor state.
   * Clock state remains at current level (may be high or low).
   */
  pause(): void {
    if (!this.isRunning) {
      return; // Not running
    }
    
    this.isRunning = false;
    
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Reset clock controller and trigger microprocessor reset
   * 
   * This method:
   * 1. Stops automatic pulsing (if running)
   * 2. Resets clock state to low
   * 3. Resets instruction counter
   * 4. Notifies listeners to reset microprocessor state
   */
  reset(): void {
    this.pause();
    this.clockState = false;
    this.instructionCount = 0;
    
    if (this.onResetCallback) {
      this.onResetCallback();
    }
    
    // Notify clock change to ensure clock is at low level
    if (this.onClockChangeCallback) {
      this.onClockChangeCallback(false);
    }
  }
  
  /**
   * Set clock frequency (in Hz)
   * 
   * If currently running, restarts with new frequency.
   * Valid range: 0.1 Hz - 10 Hz (educational range for observability)
   * 
   * @param hz Frequency in Hertz
   */
  setFrequency(hz: number): void {
    // Clamp frequency to reasonable range
    this.frequency = Math.max(0.1, Math.min(10, hz));
    
    // If running, restart with new frequency
    if (this.isRunning) {
      this.pause();
      this.run();
    }
  }
  
  /**
   * Get current controller state
   */
  getState(): ClockControllerState {
    return {
      clockState: this.clockState,
      isRunning: this.isRunning,
      frequency: this.frequency,
      instructionCount: this.instructionCount,
    };
  }
  
  /**
   * Set clock change callback
   */
  setOnClockChange(callback: ClockChangeCallback): void {
    this.onClockChangeCallback = callback;
  }
  
  /**
   * Set reset callback
   */
  setOnReset(callback: ResetCallback): void {
    this.onResetCallback = callback;
  }
  
  /**
   * Execute one clock pulse (internal method for auto-pulsing)
   * 
   * Similar to step() but doesn't check isRunning flag.
   */
  private executePulse(): void {
    // Rising edge: low → high
    this.clockState = true;
    this.instructionCount++;
    if (this.onClockChangeCallback) {
      this.onClockChangeCallback(true);
    }
    
    // Falling edge: high → low (after 50ms)
    setTimeout(() => {
      this.clockState = false;
      if (this.onClockChangeCallback) {
        this.onClockChangeCallback(false);
      }
    }, 50);
  }
}
