/**
 * Unit tests for AudioManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from '../audio-manager';

// Mock Web Audio API
class MockAudioContext {
  destination = {};
  currentTime = 0;
  
  createGain() {
    return {
      gain: {
        value: 0,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        value: 0,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  close() {
    return Promise.resolve();
  }
}

describe('AudioManager', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    // Mock AudioContext globally
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.AudioContext = MockAudioContext as any;
    
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(() => null),
    };
    
    audioManager = new AudioManager();
  });

  it('should initialize with audio disabled', () => {
    expect(audioManager.isEnabled()).toBe(false);
  });

  it('should initialize with default volume of 0.5', () => {
    expect(audioManager.getVolume()).toBe(0.5);
  });

  it('should enable audio and create AudioContext', async () => {
    await audioManager.enable();
    expect(audioManager.isEnabled()).toBe(true);
  });

  it('should disable audio and close AudioContext', async () => {
    await audioManager.enable();
    expect(audioManager.isEnabled()).toBe(true);
    
    audioManager.disable();
    expect(audioManager.isEnabled()).toBe(false);
  });

  it('should set volume within valid range', () => {
    audioManager.setVolume(0.8);
    expect(audioManager.getVolume()).toBe(0.8);
    
    // Test clamping
    audioManager.setVolume(1.5);
    expect(audioManager.getVolume()).toBe(1.0);
    
    audioManager.setVolume(-0.5);
    expect(audioManager.getVolume()).toBe(0);
  });

  it('should not update speaker when audio is disabled', () => {
    audioManager.updateSpeaker('speaker1', 3.3, 0.01);
    expect(audioManager.getActiveSpeakerCount()).toBe(0);
  });

  it('should create speaker when audio is enabled and voltage/current provided', async () => {
    await audioManager.enable();
    audioManager.updateSpeaker('speaker1', 3.3, 0.01);
    expect(audioManager.getActiveSpeakerCount()).toBe(1);
  });

  it('should not create speaker when voltage is too low', async () => {
    await audioManager.enable();
    audioManager.updateSpeaker('speaker1', 0.05, 0.01);
    expect(audioManager.getActiveSpeakerCount()).toBe(0);
  });

  it('should not create speaker when current is too low', async () => {
    await audioManager.enable();
    audioManager.updateSpeaker('speaker1', 3.3, 0.00005);
    expect(audioManager.getActiveSpeakerCount()).toBe(0);
  });

  it('should support multiple speakers', async () => {
    await audioManager.enable();
    audioManager.updateSpeaker('speaker1', 3.3, 0.01);
    audioManager.updateSpeaker('speaker2', 5.0, 0.015);
    expect(audioManager.getActiveSpeakerCount()).toBe(2);
  });

  it('should remove speaker when requested', async () => {
    await audioManager.enable();
    audioManager.updateSpeaker('speaker1', 3.3, 0.01);
    expect(audioManager.getActiveSpeakerCount()).toBe(1);
    
    audioManager.removeSpeaker('speaker1');
    expect(audioManager.getActiveSpeakerCount()).toBe(0);
  });

  it('should stop speaker when voltage drops too low', async () => {
    await audioManager.enable();
    audioManager.updateSpeaker('speaker1', 3.3, 0.01);
    expect(audioManager.getActiveSpeakerCount()).toBe(1);
    
    // Update with low voltage
    audioManager.updateSpeaker('speaker1', 0.05, 0.01);
    expect(audioManager.getActiveSpeakerCount()).toBe(0);
  });

  it('should persist volume to localStorage', () => {
    audioManager.setVolume(0.75);
    expect(global.localStorage.setItem).toHaveBeenCalledWith(
      'breadboard-lab-audio-volume',
      '0.75'
    );
  });

  it('should load volume from localStorage on initialization', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.localStorage.getItem as any).mockReturnValue('0.6');
    const newManager = new AudioManager();
    expect(newManager.getVolume()).toBe(0.6);
  });
});
