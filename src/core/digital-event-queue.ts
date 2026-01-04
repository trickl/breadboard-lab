/**
 * Digital Event Queue
 * 
 * Priority queue for digital simulation events, ordered by timestamp.
 * Supports event-driven simulation of digital components.
 */

import type { DigitalValue } from './digital-signals';

/**
 * Base interface for digital events
 */
export interface DigitalEvent {
  type: string;
  timestamp: number; // Simulation time in arbitrary units
  componentId: string; // Component that should handle this event
}

/**
 * Clock edge event
 */
export interface ClockEdgeEvent extends DigitalEvent {
  type: 'clock-edge';
  edge: 'rising' | 'falling';
  pinId: string; // Which clock pin
}

/**
 * Digital state change event
 */
export interface DigitalStateChangeEvent extends DigitalEvent {
  type: 'state-change';
  pinId: string;
  value: DigitalValue;
}

/**
 * Union type for all event types
 */
export type AnyDigitalEvent = ClockEdgeEvent | DigitalStateChangeEvent;

/**
 * Digital event queue with priority based on timestamp
 */
export class DigitalEventQueue {
  private events: AnyDigitalEvent[] = [];

  /**
   * Add an event to the queue
   * Events are inserted in sorted order by timestamp
   */
  enqueue(event: AnyDigitalEvent): void {
    // Find insertion point (binary search could optimize for large queues)
    let insertIndex = this.events.length;
    for (let i = 0; i < this.events.length; i++) {
      if (event.timestamp < this.events[i].timestamp) {
        insertIndex = i;
        break;
      }
    }
    
    this.events.splice(insertIndex, 0, event);
  }

  /**
   * Remove and return the next event (earliest timestamp)
   * Returns undefined if queue is empty
   */
  dequeue(): AnyDigitalEvent | undefined {
    return this.events.shift();
  }

  /**
   * Peek at the next event without removing it
   * Returns undefined if queue is empty
   */
  peek(): AnyDigitalEvent | undefined {
    return this.events[0];
  }

  /**
   * Get the timestamp of the next event
   * Returns undefined if queue is empty
   */
  nextTimestamp(): number | undefined {
    return this.events[0]?.timestamp;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.events.length === 0;
  }

  /**
   * Get number of events in queue
   */
  size(): number {
    return this.events.length;
  }

  /**
   * Clear all events from queue
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get all events for a specific component
   * (useful for debugging)
   */
  getEventsForComponent(componentId: string): AnyDigitalEvent[] {
    return this.events.filter((e) => e.componentId === componentId);
  }

  /**
   * Remove all events for a specific component
   * Returns number of events removed
   */
  removeEventsForComponent(componentId: string): number {
    const initialSize = this.events.length;
    this.events = this.events.filter((e) => e.componentId !== componentId);
    return initialSize - this.events.length;
  }
}

/**
 * Helper function to create a clock edge event
 */
export function createClockEdgeEvent(
  componentId: string,
  pinId: string,
  edge: 'rising' | 'falling',
  timestamp: number
): ClockEdgeEvent {
  return {
    type: 'clock-edge',
    componentId,
    pinId,
    edge,
    timestamp,
  };
}

/**
 * Helper function to create a digital state change event
 */
export function createStateChangeEvent(
  componentId: string,
  pinId: string,
  value: DigitalValue,
  timestamp: number
): DigitalStateChangeEvent {
  return {
    type: 'state-change',
    componentId,
    pinId,
    value,
    timestamp,
  };
}
