import { Zoom } from 'rete-area-plugin';

export type SmoothZoomOptions = {
  /**
   * Wheel delta → zoom mapping strength.
   *
   * We map wheel delta (in pixels) to a multiplicative factor via:
   *   factor = exp(-deltaPx * wheelZoomSpeed)
   */
  wheelZoomSpeed?: number;

  /**
   * Approximate time constant (ms) for applying a wheel gesture.
   * Higher = smoother/less twitchy; lower = snappier.
   */
  smoothTimeMs?: number;

  /** Clamp per-gesture zoom to avoid extreme jumps on high delta wheels. */
  perGestureFactorClamp?: { min: number; max: number };
};

/**
 * SmoothZoom
 *
 * rete-area-plugin's default wheel zoom is quantized to a fixed "intensity" step.
 * This subclass replaces the wheel handler so zoom scale changes are:
 * - proportional to wheel delta magnitude (trackpads feel continuous)
 * - time-smoothed/animated (mouse wheels feel less "steppy")
 */
export class SmoothZoom extends Zoom {
  private wheelZoomSpeed: number;
  private smoothTimeMs: number;
  private clamp: { min: number; max: number };

  private pendingFactor = 1;
  private raf: number | null = null;
  private lastFrameTime = 0;
  private anchor: { clientX: number; clientY: number } | null = null;

  constructor(intensity: number, options: SmoothZoomOptions = {}) {
    super(intensity);

    this.wheelZoomSpeed = options.wheelZoomSpeed ?? 0.001;
    this.smoothTimeMs = options.smoothTimeMs ?? 120;
    this.clamp = options.perGestureFactorClamp ?? { min: 0.25, max: 4 };

    // Override base wheel handler (the base constructor installs a quantized one).
    this.wheel = (e: WheelEvent) => {
      // If the user is currently pinching (2+ pointers), ignore wheel to avoid weird interactions.
      if (this.isTranslating()) return;

      // Important: keep the page from scrolling while zooming the canvas.
      e.preventDefault();

      const deltaPx = normalizeWheelDeltaToPixels(e);

      // Map delta to a multiplicative zoom factor.
      // Positive deltaY typically means "scroll down" → zoom out.
      let factor = Math.exp(-deltaPx * this.wheelZoomSpeed);
      if (!Number.isFinite(factor) || factor <= 0) return;

      // Clamp per gesture to avoid absurd jumps with some wheel devices.
      factor = clamp(factor, this.clamp.min, this.clamp.max);

      this.pendingFactor *= factor;
      this.anchor = { clientX: e.clientX, clientY: e.clientY };

      if (this.raf == null) {
        this.lastFrameTime = performance.now();
        this.raf = requestAnimationFrame(this.animate);
      }
    };
  }

  private animate = (now: number) => {
    this.raf = null;

    // If we got destroyed or never initialized.
    if (!this.element || !this.onzoom || !this.anchor) return;

    const dt = Math.max(0, now - this.lastFrameTime);
    this.lastFrameTime = now;

    // Apply a fraction of the remaining zoom each frame.
    // Using multiplicative interpolation keeps zoom smooth regardless of current scale.
    const remaining = this.pendingFactor;

    if (!Number.isFinite(remaining) || remaining <= 0) {
      this.pendingFactor = 1;
      return;
    }

    // Stop when we're close enough to 1.
    if (Math.abs(remaining - 1) < 1e-4) {
      this.pendingFactor = 1;
      return;
    }

    // How much of the remaining change to apply this frame.
    // dt/smoothTimeMs = 1 means "apply everything this frame".
    const t = clamp(dt / this.smoothTimeMs, 0, 1);

    // Apply factorStep such that (remaining / factorStep) is the new remaining.
    const factorStep = Math.pow(remaining, t);
    this.pendingFactor = remaining / factorStep;

    const delta = factorStep - 1;

    const { left, top } = this.element.getBoundingClientRect();
    const ox = (left - this.anchor.clientX) * delta;
    const oy = (top - this.anchor.clientY) * delta;

    this.onzoom(delta, ox, oy, 'wheel');

    // Continue until remaining is fully applied (or we get more wheel events).
    this.raf = requestAnimationFrame(this.animate);
  };

  override destroy(): void {
    if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.pendingFactor = 1;
    this.anchor = null;
    super.destroy();
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeWheelDeltaToPixels(e: WheelEvent): number {
  // DOM_DELTA_PIXEL = 0, DOM_DELTA_LINE = 1, DOM_DELTA_PAGE = 2
  if (e.deltaMode === 1) return e.deltaY * 16; // approx line height
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // page
  return e.deltaY;
}
