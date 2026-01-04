import { describe, it, expect } from 'vitest';
import {
  DigitalEventQueue,
  createClockEdgeEvent,
  createStateChangeEvent,
} from '../digital-event-queue';

describe('Digital Event Queue', () => {
  describe('Basic operations', () => {
    it('should start empty', () => {
      const queue = new DigitalEventQueue();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('should enqueue and dequeue a single event', () => {
      const queue = new DigitalEventQueue();
      const event = createClockEdgeEvent('cpu1', 'CLK', 'rising', 100);
      
      queue.enqueue(event);
      expect(queue.isEmpty()).toBe(false);
      expect(queue.size()).toBe(1);
      
      const dequeued = queue.dequeue();
      expect(dequeued).toEqual(event);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should return undefined when dequeueing from empty queue', () => {
      const queue = new DigitalEventQueue();
      expect(queue.dequeue()).toBe(undefined);
    });

    it('should peek at next event without removing it', () => {
      const queue = new DigitalEventQueue();
      const event = createClockEdgeEvent('cpu1', 'CLK', 'rising', 100);
      
      queue.enqueue(event);
      expect(queue.peek()).toEqual(event);
      expect(queue.size()).toBe(1); // Not removed
      
      expect(queue.peek()).toEqual(event); // Can peek multiple times
      expect(queue.size()).toBe(1);
    });

    it('should clear all events', () => {
      const queue = new DigitalEventQueue();
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'falling', 200));
      
      expect(queue.size()).toBe(2);
      queue.clear();
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('Priority ordering', () => {
    it('should dequeue events in timestamp order', () => {
      const queue = new DigitalEventQueue();
      
      // Enqueue in non-chronological order
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 300));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 200));
      
      // Should dequeue in chronological order
      expect(queue.dequeue()?.timestamp).toBe(100);
      expect(queue.dequeue()?.timestamp).toBe(200);
      expect(queue.dequeue()?.timestamp).toBe(300);
    });

    it('should maintain order when events have same timestamp', () => {
      const queue = new DigitalEventQueue();
      
      const event1 = createClockEdgeEvent('cpu1', 'CLK', 'rising', 100);
      const event2 = createStateChangeEvent('cpu1', 'OUT0', 1, 100);
      const event3 = createClockEdgeEvent('cpu2', 'CLK', 'rising', 100);
      
      queue.enqueue(event1);
      queue.enqueue(event2);
      queue.enqueue(event3);
      
      // Should maintain insertion order for same timestamp
      expect(queue.dequeue()).toEqual(event1);
      expect(queue.dequeue()).toEqual(event2);
      expect(queue.dequeue()).toEqual(event3);
    });

    it('should get next timestamp without dequeueing', () => {
      const queue = new DigitalEventQueue();
      
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 300));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      
      expect(queue.nextTimestamp()).toBe(100);
      expect(queue.size()).toBe(2); // Not removed
    });

    it('should return undefined for next timestamp of empty queue', () => {
      const queue = new DigitalEventQueue();
      expect(queue.nextTimestamp()).toBe(undefined);
    });
  });

  describe('Event types', () => {
    it('should handle clock edge events', () => {
      const queue = new DigitalEventQueue();
      const event = createClockEdgeEvent('cpu1', 'CLK', 'rising', 100);
      
      queue.enqueue(event);
      const dequeued = queue.dequeue();
      
      expect(dequeued?.type).toBe('clock-edge');
      if (dequeued?.type === 'clock-edge') {
        expect(dequeued.edge).toBe('rising');
        expect(dequeued.pinId).toBe('CLK');
      }
    });

    it('should handle state change events', () => {
      const queue = new DigitalEventQueue();
      const event = createStateChangeEvent('cpu1', 'OUT0', 1, 100);
      
      queue.enqueue(event);
      const dequeued = queue.dequeue();
      
      expect(dequeued?.type).toBe('state-change');
      if (dequeued?.type === 'state-change') {
        expect(dequeued.value).toBe(1);
        expect(dequeued.pinId).toBe('OUT0');
      }
    });

    it('should handle mixed event types', () => {
      const queue = new DigitalEventQueue();
      
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      queue.enqueue(createStateChangeEvent('cpu1', 'OUT0', 1, 150));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'falling', 200));
      
      expect(queue.dequeue()?.type).toBe('clock-edge');
      expect(queue.dequeue()?.type).toBe('state-change');
      expect(queue.dequeue()?.type).toBe('clock-edge');
    });
  });

  describe('Component filtering', () => {
    it('should get events for specific component', () => {
      const queue = new DigitalEventQueue();
      
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      queue.enqueue(createClockEdgeEvent('cpu2', 'CLK', 'rising', 150));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'falling', 200));
      
      const cpu1Events = queue.getEventsForComponent('cpu1');
      expect(cpu1Events.length).toBe(2);
      expect(cpu1Events[0].timestamp).toBe(100);
      expect(cpu1Events[1].timestamp).toBe(200);
    });

    it('should remove events for specific component', () => {
      const queue = new DigitalEventQueue();
      
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      queue.enqueue(createClockEdgeEvent('cpu2', 'CLK', 'rising', 150));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'falling', 200));
      
      const removed = queue.removeEventsForComponent('cpu1');
      expect(removed).toBe(2);
      expect(queue.size()).toBe(1);
      expect(queue.peek()?.componentId).toBe('cpu2');
    });

    it('should return 0 when removing events for non-existent component', () => {
      const queue = new DigitalEventQueue();
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      
      const removed = queue.removeEventsForComponent('cpu2');
      expect(removed).toBe(0);
      expect(queue.size()).toBe(1);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle rapid enqueue/dequeue cycles', () => {
      const queue = new DigitalEventQueue();
      
      for (let i = 0; i < 100; i++) {
        queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', i * 10));
      }
      
      expect(queue.size()).toBe(100);
      
      for (let i = 0; i < 50; i++) {
        expect(queue.dequeue()?.timestamp).toBe(i * 10);
      }
      
      expect(queue.size()).toBe(50);
      expect(queue.nextTimestamp()).toBe(500);
    });

    it('should handle interleaved operations', () => {
      const queue = new DigitalEventQueue();
      
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 100));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 300));
      
      expect(queue.dequeue()?.timestamp).toBe(100);
      
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 200));
      queue.enqueue(createClockEdgeEvent('cpu1', 'CLK', 'rising', 400));
      
      expect(queue.dequeue()?.timestamp).toBe(200);
      expect(queue.dequeue()?.timestamp).toBe(300);
      expect(queue.dequeue()?.timestamp).toBe(400);
    });
  });
});
