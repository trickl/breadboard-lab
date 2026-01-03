import type { AnyComponent, SimulationResult, Position } from '@/core/types';
import { ComponentType } from '@/core/types';

/**
 * Represents an animated particle showing current flow
 */
interface Particle {
  edgeId: string; // Which circuit edge this particle belongs to
  progress: number; // Position along path (0.0 to 1.0)
  speed: number; // Movement speed in units per second (proportional to current)
  brightness: number; // Visual intensity (0.0 to 1.0, proportional to current)
  color: string; // RGB color string
}

/**
 * Represents a visual path for particle animation
 */
interface AnimationPath {
  edgeId: string;
  points: Array<{ x: number; y: number }>; // Path coordinates
  reversed: boolean; // If true, particles should flow in reverse direction
}

/**
 * Configuration for current animation
 */
interface AnimationConfig {
  currentThreshold: number; // Minimum current to show particles (Amperes)
  particleSize: number; // Particle diameter in pixels
  baseSpeed: number; // Base speed multiplier
  minParticlesPerEdge: number; // Minimum particles for visible current
  maxParticlesPerEdge: number; // Maximum particles per edge
}

/**
 * Animates current flow visualization using particles moving along circuit edges
 */
export class CurrentAnimator {
  private particles: Particle[] = [];
  private animationPaths: Map<string, AnimationPath> = new Map();
  private animationFrame: number | null = null;
  private lastTimestamp: number = 0;
  private svgElement: SVGElement | null = null;
  private particleGroup: SVGGElement | null = null;
  private isRunning = false;

  // Animation configuration matching planning document specs (lines 798-815)
  private readonly config: AnimationConfig = {
    currentThreshold: 1e-6, // 1µA minimum
    particleSize: 3, // 3px diameter
    baseSpeed: 0.3, // Base speed units per second
    minParticlesPerEdge: 1,
    maxParticlesPerEdge: 5,
  };

  /**
   * Start current flow animation
   * @param simulationResult Simulation results containing edge currents
   * @param components All components in the circuit
   * @param svgContainer SVG element to render particles into
   */
  start(
    simulationResult: SimulationResult,
    components: AnyComponent[],
    svgContainer: SVGElement
  ): void {
    if (!simulationResult.success) {
      this.stop();
      return;
    }

    this.svgElement = svgContainer;
    this.stop(); // Clean up any existing animation

    // Build animation paths from components
    this.buildAnimationPaths(components, simulationResult);

    // Create particles for edges with significant current
    this.createParticles(simulationResult);

    // Start animation loop if we have particles
    if (this.particles.length > 0) {
      this.isRunning = true;
      this.lastTimestamp = performance.now();
      this.animate(this.lastTimestamp);
    }
  }

  /**
   * Stop animation and clean up
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.particles = [];
    this.animationPaths.clear();
    
    // Remove particle rendering group
    if (this.particleGroup && this.particleGroup.parentNode) {
      this.particleGroup.parentNode.removeChild(this.particleGroup);
    }
    this.particleGroup = null;
  }

  /**
   * Build animation paths from components
   */
  private buildAnimationPaths(
    components: AnyComponent[],
    simulationResult: SimulationResult
  ): void {
    this.animationPaths.clear();

    for (const component of components) {
      if (component.positions.length < 2) continue;

      const edgeId = this.findEdgeIdForComponent(component, simulationResult);
      if (!edgeId) continue;

      const current = simulationResult.edgeCurrents.get(edgeId);
      if (!current || Math.abs(current) < this.config.currentThreshold) {
        continue;
      }

      // Get component path coordinates
      const path = this.buildPathForComponent(component);
      if (path.points.length < 2) continue;

      // Determine flow direction based on current sign
      // Positive current means flow from nodeA to nodeB (start to end of path)
      // Negative current means flow from nodeB to nodeA (reverse)
      path.reversed = current < 0;
      path.edgeId = edgeId;

      this.animationPaths.set(edgeId, path);
    }
  }

  /**
   * Find the edge ID corresponding to a component
   */
  private findEdgeIdForComponent(
    component: AnyComponent,
    simulationResult: SimulationResult
  ): string | null {
    // Edge IDs typically match component IDs in the circuit extraction
    // Try the component ID first
    if (simulationResult.edgeCurrents.has(component.id)) {
      return component.id;
    }

    // If not found, it might mean the component is not in a valid circuit
    return null;
  }

  /**
   * Build path coordinates for a component
   */
  private buildPathForComponent(component: AnyComponent): AnimationPath {
    const start = this.positionToPixels(component.positions[0]);
    const end = this.positionToPixels(component.positions[1]);

    const animPath: AnimationPath = {
      edgeId: '',
      points: [],
      reversed: false,
    };

    // For wires, use Manhattan routing (orthogonal path)
    if (component.type === ComponentType.WIRE) {
      animPath.points = [
        start,
        { x: start.x, y: (start.y + end.y) / 2 },
        { x: end.x, y: (start.y + end.y) / 2 },
        end,
      ];
    } else {
      // For other components, use straight line
      animPath.points = [start, end];
    }

    return animPath;
  }

  /**
   * Convert breadboard position to pixel coordinates
   * (Matches ComponentRenderer.positionToPixels)
   */
  private positionToPixels(pos: Position): { x: number; y: number } {
    const HOLE_SIZE = 20;
    const HOLE_MARGIN = 3;
    const HOLE_SPACING = HOLE_SIZE + HOLE_MARGIN * 2;

    return {
      x: pos.col * HOLE_SPACING + HOLE_SPACING / 2,
      y: pos.row * HOLE_SPACING + HOLE_SPACING / 2,
    };
  }

  /**
   * Create particles for edges with current
   */
  private createParticles(simulationResult: SimulationResult): void {
    this.particles = [];

    for (const edgeId of this.animationPaths.keys()) {
      const current = simulationResult.edgeCurrents.get(edgeId);
      if (!current || Math.abs(current) < this.config.currentThreshold) {
        continue;
      }

      const absCurrent = Math.abs(current);

      // Calculate particle count based on current magnitude
      const particleCount = this.calculateParticleCount(absCurrent);

      // Calculate speed and visual properties based on current magnitude
      const speed = this.calculateSpeed(absCurrent);
      const { color, brightness } = this.calculateVisualProperties(absCurrent);

      // Create particles evenly spaced along the path
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          edgeId,
          progress: i / particleCount,
          speed,
          brightness,
          color,
        });
      }
    }
  }

  /**
   * Calculate number of particles based on current magnitude
   */
  private calculateParticleCount(current: number): number {
    // Current in Amperes
    const currentMa = current * 1000; // Convert to milliamps

    if (currentMa < 1) {
      return this.config.minParticlesPerEdge; // Low current: 1 particle
    } else if (currentMa < 10) {
      return 3; // Medium current: 3 particles
    } else {
      return this.config.maxParticlesPerEdge; // High current: 5 particles
    }
  }

  /**
   * Calculate particle speed based on current magnitude
   */
  private calculateSpeed(current: number): number {
    const currentMa = current * 1000;

    if (currentMa < 1) {
      return this.config.baseSpeed * 0.5; // Slow for low current
    } else if (currentMa < 10) {
      return this.config.baseSpeed * 1.0; // Medium speed
    } else {
      return this.config.baseSpeed * 2.0; // Fast for high current
    }
  }

  /**
   * Calculate visual properties (color, brightness) based on current magnitude
   */
  private calculateVisualProperties(current: number): {
    color: string;
    brightness: number;
  } {
    const currentMa = current * 1000;

    if (currentMa < 1) {
      // Low current: faint blue
      return {
        color: 'rgba(0, 100, 255, 0.4)',
        brightness: 0.4,
      };
    } else if (currentMa < 10) {
      // Medium current: medium blue
      return {
        color: 'rgba(0, 150, 255, 0.7)',
        brightness: 0.7,
      };
    } else {
      // High current: bright blue
      return {
        color: 'rgba(0, 200, 255, 1.0)',
        brightness: 1.0,
      };
    }
  }

  /**
   * Animation loop
   */
  private animate = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
    this.lastTimestamp = timestamp;

    // Update particle positions
    this.updateParticles(deltaTime);

    // Render particles
    this.renderParticles();

    // Request next frame
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  /**
   * Update particle positions
   */
  private updateParticles(deltaTime: number): void {
    for (const particle of this.particles) {
      // Update progress along path
      particle.progress += particle.speed * deltaTime;

      // Wrap around when reaching the end
      if (particle.progress >= 1.0) {
        particle.progress -= Math.floor(particle.progress);
      }
    }
  }

  /**
   * Render particles to SVG
   */
  private renderParticles(): void {
    if (!this.svgElement) return;

    // Create or reuse particle group
    if (!this.particleGroup) {
      this.particleGroup = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g'
      );
      this.particleGroup.setAttribute('class', 'current-particles');
      this.svgElement.appendChild(this.particleGroup);
    }

    // Clear existing particles by removing all children
    while (this.particleGroup.firstChild) {
      this.particleGroup.removeChild(this.particleGroup.firstChild);
    }

    // Render each particle
    for (const particle of this.particles) {
      const path = this.animationPaths.get(particle.edgeId);
      if (!path) continue;

      // Calculate particle position along path
      const position = this.getPositionOnPath(path, particle.progress);
      if (!position) continue;

      // Create circle element
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      circle.setAttribute('cx', position.x.toString());
      circle.setAttribute('cy', position.y.toString());
      circle.setAttribute('r', (this.config.particleSize / 2).toString());
      circle.setAttribute('fill', particle.color);
      circle.setAttribute('opacity', particle.brightness.toString());

      this.particleGroup.appendChild(circle);
    }
  }

  /**
   * Get position along a path at given progress (0.0 to 1.0)
   */
  private getPositionOnPath(
    path: AnimationPath,
    progress: number
  ): { x: number; y: number } | null {
    if (path.points.length < 2) return null;

    // Adjust progress if path is reversed
    const effectiveProgress = path.reversed ? 1.0 - progress : progress;

    // Calculate total path length
    const segmentLengths: number[] = [];
    let totalLength = 0;

    for (let i = 0; i < path.points.length - 1; i++) {
      const p1 = path.points[i];
      const p2 = path.points[i + 1];
      const length = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
      segmentLengths.push(length);
      totalLength += length;
    }

    if (totalLength === 0) return path.points[0];

    // Find which segment contains the target distance
    const targetDistance = effectiveProgress * totalLength;
    let accumulatedDistance = 0;

    for (let i = 0; i < segmentLengths.length; i++) {
      const segmentLength = segmentLengths[i];
      if (accumulatedDistance + segmentLength >= targetDistance) {
        // Target is in this segment
        const segmentProgress =
          (targetDistance - accumulatedDistance) / segmentLength;
        const p1 = path.points[i];
        const p2 = path.points[i + 1];

        return {
          x: p1.x + (p2.x - p1.x) * segmentProgress,
          y: p1.y + (p2.y - p1.y) * segmentProgress,
        };
      }
      accumulatedDistance += segmentLength;
    }

    // Fallback to last point
    return path.points[path.points.length - 1];
  }
}
