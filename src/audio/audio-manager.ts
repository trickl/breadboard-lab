/**
 * Audio Manager for speaker component audio output
 * Manages Web Audio API integration and speaker sound generation
 */

interface SpeakerNode {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  lastVoltage: number;
  lastCurrent: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private speakers: Map<string, SpeakerNode> = new Map();
  private enabled: boolean = false;
  private volume: number = 0.5; // 0.0 to 1.0
  private static readonly MIN_FREQUENCY = 200; // Hz
  private static readonly MAX_FREQUENCY = 2000; // Hz
  private static readonly MIN_VOLTAGE = 0; // V
  private static readonly MAX_VOLTAGE = 5; // V
  private static readonly RAMP_TIME = 0.05; // 50ms smooth transition

  constructor() {
    // Load saved preferences
    this.loadPreferences();
  }

  /**
   * Enable audio output (requires user gesture)
   */
  async enable(): Promise<void> {
    if (this.enabled) return;

    try {
      // Initialize AudioContext
      this.audioContext = new AudioContext();
      
      // Create master gain node for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);

      this.enabled = true;
      this.savePreferences();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error('Failed to enable audio. Your browser may not support Web Audio API.');
    }
  }

  /**
   * Disable audio output
   */
  disable(): void {
    if (!this.enabled) return;

    // Stop all oscillators
    this.speakers.forEach((_speaker, speakerId) => {
      this.stopSpeaker(speakerId);
    });
    this.speakers.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }

    this.enabled = false;
    this.savePreferences();
  }

  /**
   * Check if audio is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update or create audio for a speaker component
   */
  updateSpeaker(speakerId: string, voltage: number, current: number): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    // Check if speaker already exists
    const existingSpeaker = this.speakers.get(speakerId);

    // If voltage or current is too low, stop the speaker
    if (Math.abs(voltage) < 0.1 || Math.abs(current) < 0.0001) {
      if (existingSpeaker) {
        this.stopSpeaker(speakerId);
      }
      return;
    }

    if (existingSpeaker) {
      // Update existing speaker
      this.updateSpeakerParameters(existingSpeaker, voltage, current);
    } else {
      // Create new speaker
      this.createSpeaker(speakerId, voltage, current);
    }
  }

  /**
   * Remove a speaker component
   */
  removeSpeaker(speakerId: string): void {
    if (this.speakers.has(speakerId)) {
      this.stopSpeaker(speakerId);
    }
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(level: number): void {
    this.volume = Math.max(0, Math.min(1, level));
    
    if (this.masterGain && this.audioContext) {
      // Smooth volume change
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + AudioManager.RAMP_TIME);
    }

    this.savePreferences();
  }

  /**
   * Get current volume level
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Get number of active speakers
   */
  getActiveSpeakerCount(): number {
    return this.speakers.size;
  }

  /**
   * Create a new speaker oscillator
   */
  private createSpeaker(speakerId: string, voltage: number, current: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Calculate frequency and amplitude
    const frequency = this.voltageToFrequency(voltage);
    const amplitude = this.currentToAmplitude(current);

    // Configure oscillator
    oscillator.type = 'sine'; // Smooth sine wave for pleasant sound
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Configure gain (volume)
    gainNode.gain.setValueAtTime(amplitude, this.audioContext.currentTime);

    // Connect nodes: oscillator -> gainNode -> masterGain -> destination
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Start oscillator
    oscillator.start();

    // Store speaker node
    this.speakers.set(speakerId, {
      oscillator,
      gainNode,
      lastVoltage: voltage,
      lastCurrent: current,
    });
  }

  /**
   * Update existing speaker parameters
   */
  private updateSpeakerParameters(speaker: SpeakerNode, voltage: number, current: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // Only update if values have changed significantly
    const voltageChanged = Math.abs(voltage - speaker.lastVoltage) > 0.01;
    const currentChanged = Math.abs(current - speaker.lastCurrent) > 0.0001;

    if (voltageChanged) {
      const frequency = this.voltageToFrequency(voltage);
      speaker.oscillator.frequency.cancelScheduledValues(now);
      speaker.oscillator.frequency.setValueAtTime(speaker.oscillator.frequency.value, now);
      speaker.oscillator.frequency.linearRampToValueAtTime(frequency, now + AudioManager.RAMP_TIME);
      speaker.lastVoltage = voltage;
    }

    if (currentChanged) {
      const amplitude = this.currentToAmplitude(current);
      speaker.gainNode.gain.cancelScheduledValues(now);
      speaker.gainNode.gain.setValueAtTime(speaker.gainNode.gain.value, now);
      speaker.gainNode.gain.linearRampToValueAtTime(amplitude, now + AudioManager.RAMP_TIME);
      speaker.lastCurrent = current;
    }
  }

  /**
   * Stop and remove a speaker
   */
  private stopSpeaker(speakerId: string): void {
    const speaker = this.speakers.get(speakerId);
    if (!speaker) return;

    try {
      // Stop oscillator gracefully
      speaker.oscillator.stop();
      speaker.oscillator.disconnect();
      speaker.gainNode.disconnect();
    } catch (error) {
      // Oscillator may already be stopped, ignore error
    }

    this.speakers.delete(speakerId);
  }

  /**
   * Map voltage to frequency (logarithmic scale)
   */
  private voltageToFrequency(voltage: number): number {
    // Clamp voltage to range
    const clampedVoltage = Math.max(AudioManager.MIN_VOLTAGE, Math.min(AudioManager.MAX_VOLTAGE, Math.abs(voltage)));
    
    // Normalize to 0-1
    const normalized = clampedVoltage / AudioManager.MAX_VOLTAGE;
    
    // Logarithmic mapping for more musical frequency distribution
    // log scale: lower voltages produce lower frequencies, higher voltages produce higher frequencies
    const logMin = Math.log(AudioManager.MIN_FREQUENCY);
    const logMax = Math.log(AudioManager.MAX_FREQUENCY);
    const frequency = Math.exp(logMin + normalized * (logMax - logMin));
    
    return frequency;
  }

  /**
   * Map current to amplitude (linear scale)
   */
  private currentToAmplitude(current: number): number {
    // Typical speaker current range: 0-20mA
    const maxCurrent = 0.02; // 20mA
    const clampedCurrent = Math.max(0, Math.min(maxCurrent, Math.abs(current)));
    
    // Normalize to 0-1
    const normalized = clampedCurrent / maxCurrent;
    
    // Scale to reasonable amplitude (0.1 to 0.3 to avoid distortion)
    // Lower base amplitude when multiple speakers are active
    const speakerCount = this.speakers.size;
    const maxAmplitude = speakerCount > 1 ? 0.2 : 0.3;
    const minAmplitude = 0.05;
    
    return minAmplitude + normalized * (maxAmplitude - minAmplitude);
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const savedVolume = localStorage.getItem('breadboard-lab-audio-volume');
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }
      
      // Audio starts disabled by default (user must explicitly enable)
      this.enabled = false;
    } catch (error) {
      // localStorage might not be available, use defaults
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem('breadboard-lab-audio-volume', this.volume.toString());
    } catch (error) {
      // localStorage might not be available, ignore
    }
  }
}
