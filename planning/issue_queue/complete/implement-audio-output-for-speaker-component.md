Implement audio output for speaker component with Web Audio API integration

## Context

Breadboard Lab includes a real-world speaker component (8Ω breadboard module, 0.5W, 300Hz-5kHz frequency response) in the component library. This speaker can be placed on the breadboard, connected to circuits, and the DC simulator computes voltage and current across its terminals. However, the speaker is currently silent—it produces no actual audio output.

The planning document explicitly requires audio output capability as a core educational feature. The mission is to provide a tool where circuits don't just simulate—they behave like real electronics. A speaker component that makes no sound violates this principle and undermines the educational value of the tool.

## Gap Analysis

**Long-term goal** (`planning/vision/goal.md`, lines 353-364):

> "Audio output capability (speaker) — required"
>
> - Speaker components produce real audio via the browser (Web Audio API)
> - Audio is disabled by default; users must explicitly enable sound
> - Audio waveform is derived from solver output across speaker terminals
>
> Acceptance criteria:
>
> - [ ] Enabling sound produces audible output for a driven speaker circuit
> - [ ] Disabling sound mutes output immediately
> - [ ] Drive frequency changes the audible pitch

**Current state** (`planning/state/system_capabilities.md`, lines 79-80):

- Speaker component exists in library with datasheet-accurate specifications
- Component can be placed and simulated (voltage/current computed)
- ❌ No audio output implementation
- ❌ No Web Audio API integration
- ❌ No UI controls for enabling/disabling sound

**Gap**: The speaker component is a "fake" component—it exists visually and electrically but produces no sensory output. This is the most significant gap between the "real-world parts" promise and current implementation.

## Proposed Development Task

**Implement audio output for speaker component with Web Audio API integration**

### Scope

Create an audio output system that:

1. **Detects speaker components** in the circuit and identifies their terminals
2. **Derives audio waveform** from solver output:
   - For DC circuits: compute voltage across speaker terminals
   - For time-varying signals: extract waveform data from transient simulation (future: SPICE integration)
   - Initial implementation: synthesize tone from DC voltage level (simple proof-of-concept)
3. **Integrates Web Audio API** to produce actual browser audio:
   - Create AudioContext and oscillator nodes
   - Map voltage/current to audio amplitude
   - Support basic waveforms (sine, square, sawtooth for different circuit types)
4. **Provides user controls**:
   - "Enable Sound" toggle button (default: disabled)
   - Volume control slider
   - Visual indicator when sound is active
5. **Updates audio in real-time** as circuit changes
6. **Handles multiple speakers** (if circuit has multiple speaker components)
7. **Cleans up audio resources** when speaker removed or sound disabled

### Technical Approach

**Phase 1: Audio Infrastructure**

- Create `AudioManager` class (`src/audio/audio-manager.ts`)
  - Initialize Web Audio API context
  - Manage oscillator nodes per speaker component
  - Handle user gesture requirement (audio must start after user interaction)
  - Cleanup and resource management

**Phase 2: Circuit-to-Audio Mapping**

- Extend `BreadboardApp` to detect speaker components
- After simulation, compute voltage/current across each speaker
- Map electrical values to audio parameters:
  - **Voltage magnitude** → amplitude (volume)
  - **Current frequency** (if time-domain data available) → tone frequency
  - **DC voltage** → synthesized tone (e.g., voltage level maps to frequency)
- Initial simple mapping: 0-5V maps to 200-2000Hz frequency range

**Phase 3: UI Controls**

- Add sound control panel to toolbar:
  - 🔇/🔊 Enable/Disable button
  - Volume slider (0-100%)
  - Active speaker indicator
- Store audio enabled state (localStorage persistence)
- Handle keyboard shortcut for mute/unmute (M key)

**Phase 4: Real-time Updates**

- Audio updates automatically when:
  - Component added/removed/moved
  - Circuit topology changes
  - Component values change (resistor, voltage supply)
  - Speaker voltage/current changes
- Smooth transitions (no clicks/pops when circuit changes)
- Debounce rapid changes to avoid audio glitches

**Phase 5: Multi-speaker Support**

- Support multiple independent speakers in same circuit
- Each speaker gets its own oscillator node
- Mix audio signals when multiple speakers active
- Pan control if speakers are spatially separated on breadboard

### Success Criteria

- [ ] Web Audio API context initializes after user enables sound
- [ ] Speaker component with DC voltage across terminals produces audible tone
- [ ] Tone frequency or amplitude changes when circuit values change
- [ ] Enable/disable button mutes/unmutes audio immediately
- [ ] Volume control adjusts output level smoothly
- [ ] Audio stops when speaker component is removed
- [ ] No audio glitches or clicks during circuit changes
- [ ] Audio works in major browsers (Chrome, Firefox, Safari, Edge)
- [ ] Multiple speakers can play simultaneously if present in circuit
- [ ] Audio resources cleanup properly (no memory leaks)
- [ ] Default state is audio disabled (no unexpected sound)
- [ ] Visual indicator shows when audio is active

### Educational and User Experience Impact

**Transforms passive simulation into active experience:**

- Students **hear** the circuit working, not just see simulation numbers
- Immediate feedback: change a resistor value → hear pitch/volume change
- Multi-sensory learning reinforces understanding of electrical concepts

**Real-world connection:**

- Students learn that speaker impedance matters (8Ω in library specs)
- Demonstrates power concepts (wattage limits, voltage-to-sound relationship)
- Prepares students for actual breadboard prototyping with real speakers

**Unique differentiator:**

- Most circuit simulators have visual output only
- Audio output makes Breadboard Lab memorable and engaging
- Particularly effective for teaching oscillators, 555 timers, audio circuits

**Example educational circuits enabled:**

- Simple buzzer circuit (speaker + switch + battery)
- Tone generator with variable frequency (potentiometer → pitch)
- Alarm circuit (capacitor charge/discharge → beep pattern)
- Audio amplifier demonstration (input signal → amplified output)

### Alignment with Vision

This task directly implements a **required** capability from the planning document:

- `goal.md` lines 353-364: "Audio output capability (speaker) — required"
- Acceptance criteria explicitly defined
- Listed in Solver & Simulation Capabilities section
- Part of the target system specification, not optional enhancement

The planning document states this is **required**, not a "nice-to-have" or future enhancement.

### Priority Justification

This is the most important next task because:

1. **Completes existing investment**: Speaker component already exists in library, already renders, already simulates—but doesn't fulfill its purpose. This is 80% complete infrastructure waiting for the final 20% to be useful.

2. **High educational impact, reasonable scope**: Audio output is a powerful teaching tool, and Web Audio API integration is well-defined with clear browser support. This is not a multi-month research project.

3. **Explicitly required**: Planning document marks this as "required" with specific acceptance criteria. This is not optional.

4. **Immediate user value**: Students can build and hear simple circuits today (buzzer, tone generator) without waiting for SPICE simulation or microprocessor emulation.

5. **Unique differentiator**: Most simulators don't produce sound. This feature makes Breadboard Lab memorable and engaging in a way that visual overlays alone cannot achieve.

6. **Prerequisites met**: DC solver works, component library exists, speaker specs are defined, simulation infrastructure is stable. All dependencies are ready.

7. **Lower risk than alternatives**: Compared to implementing SPICE (complex, large dependency) or microprocessor (requires instruction set design), audio output is browser-native, well-documented, and has clear success criteria.

8. **Enables future enhancements**: Once audio infrastructure exists, it can be extended to support:
   - Waveform generation from SPICE transient analysis
   - Multiple oscillator patterns (square wave, sawtooth, PWM)
   - Audio visualization (oscilloscope view)
   - Recording/playback of circuit audio

### Non-Goals

This task specifically does **NOT** include:

- Full-fidelity audio amplifier simulation (not physically accurate speaker response)
- Complex waveform synthesis from time-domain data (requires SPICE integration, future work)
- Audio recording/export to WAV or MP3 files (future enhancement)
- Realistic speaker acoustics or room modeling (not an audio engineering simulator)
- Headphone jack or line-out simulation (beyond browser audio output)
- MIDI or musical note mapping (audio education, not music education tool)
- Multiple audio output devices or routing (browser default audio device only)

Initial implementation focuses on **proof of concept**: speaker produces sound derived from circuit behavior, with user controls for enabling/muting.

## Implementation Plan

### Step 1: Create Audio Manager Infrastructure

Create `src/audio/audio-manager.ts`:

```typescript
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private oscillators: Map<string, OscillatorNode> = new Map();
  private enabled: boolean = false;
  private volume: number = 0.5;

  constructor() {}

  async enable(): Promise<void> {
    // Initialize AudioContext (requires user gesture)
    // Create master gain node for volume control
  }

  disable(): void {
    // Stop all oscillators
    // Close AudioContext
  }

  updateSpeaker(speakerId: string, voltage: number, current: number): void {
    // Map voltage/current to frequency and amplitude
    // Create or update oscillator for this speaker
  }

  removeSpeaker(speakerId: string): void {
    // Stop and remove oscillator for this speaker
  }

  setVolume(level: number): void {
    // Update master gain node
  }
}
```

### Step 2: Integrate Audio Manager into BreadboardApp

Extend `src/ui/breadboard-app.ts`:

- Add AudioManager instance
- Detect speaker components after each render
- Call `updateSpeaker()` for each speaker with simulation results
- Call `removeSpeaker()` when speaker removed

### Step 3: Add UI Controls

Add to toolbar in `breadboard-app.ts`:

```html
<div class="audio-controls">
  <button id="toggle-audio" class="btn-audio">🔇 Enable Sound</button>
  <input type="range" id="volume-slider" min="0" max="100" value="50" disabled />
  <span id="audio-indicator" class="hidden">🔊 Audio Active</span>
</div>
```

Add event listeners:

- Toggle button: enable/disable audio
- Volume slider: adjust audio level
- Update button icon when audio state changes

### Step 4: Implement Voltage-to-Audio Mapping

Simple initial mapping:

- **Voltage** (0-5V) → **Frequency** (200-2000Hz) using logarithmic scale
- **Current** (0-20mA) → **Amplitude** (0-1.0) using linear scale
- Use sine wave oscillator for smooth tone
- Smooth parameter changes (ramp to new value over 50ms to avoid clicks)

### Step 5: Test with Example Circuits

Create test circuits:

1. **Simple buzzer**: 5V power supply → speaker → ground (constant tone)
2. **Variable tone**: Power supply → resistor (variable) → speaker → ground (pitch changes with resistance)
3. **Two speakers**: Two independent speaker circuits (test multi-speaker mixing)

Add to example library or create as visual regression tests.

### Step 6: Documentation

Update README.md:

- Add "Audio Output" section explaining speaker component
- Document how to enable sound and adjust volume
- Include example circuit for testing audio

Create inline help:

- Tooltip on Enable Sound button explaining user interaction requirement
- Warning when speaker has no voltage (circuit not complete)

## Estimated Effort

3-4 days of focused development:

- **Day 1**: Audio manager infrastructure, Web Audio API setup, basic oscillator integration
- **Day 2**: Circuit-to-audio mapping, speaker detection, voltage/current handling
- **Day 3**: UI controls, volume/enable/disable, visual indicators, keyboard shortcuts
- **Day 4**: Multi-speaker support, edge case handling, browser compatibility testing, documentation

## Dependencies

All required infrastructure already exists:

- ✅ Speaker component in library with electrical specifications
- ✅ DC circuit simulator computes voltage and current
- ✅ Component placement and rendering system
- ✅ Simulation results available in `SimulationResult` interface
- ✅ Modern browsers support Web Audio API natively
- ✅ UI framework (vanilla TypeScript) supports adding controls

## Risks and Mitigations

**Risk**: Web Audio API requires user gesture to initialize

- _Mitigation_: Audio disabled by default; explicit "Enable Sound" button provides gesture; show clear messaging to user

**Risk**: Audio glitches or clicks when circuit changes rapidly

- _Mitigation_: Use AudioParam.linearRampToValueAtTime() for smooth transitions; debounce rapid changes; stop oscillator cleanly before removing

**Risk**: Browser compatibility differences (Safari, Firefox)

- _Mitigation_: Test on all major browsers; use standard Web Audio API features only; provide fallback messaging if audio context fails

**Risk**: DC voltage doesn't naturally map to audio frequency

- _Mitigation_: Use simple heuristic for initial implementation (voltage → frequency mapping); document as "audio demonstration mode" not "physically accurate speaker model"; can be refined later with SPICE integration

**Risk**: Multiple speakers cause audio clipping or distortion

- _Mitigation_: Mix signals at lower gain per speaker; implement master limiter/compressor; warn user if too many speakers active

**Risk**: Audio continues when page hidden (battery drain)

- _Mitigation_: Use Page Visibility API to pause audio when tab backgrounded; resume when tab active again

**Risk**: Users expect realistic speaker response (bass, treble, resonance)

- _Mitigation_: Clearly document that this is "audio output demonstration" not "high-fidelity speaker simulation"; focus on educational value (hear the circuit work) not audio quality

## References

- `planning/vision/goal.md` - Lines 353-364: "Audio output capability (speaker) — required"
- `planning/state/system_capabilities.md` - Lines 79-80: Speaker component exists but no audio
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Audio API Browser Compatibility](https://caniuse.com/audio-api)
- Component library: `src/library/other-components.ts` (speaker specifications)

## Success Metrics

After implementation:

1. ✅ Speaker component produces audible tone when circuit has voltage across terminals
2. ✅ "Enable Sound" button starts audio (user control)
3. ✅ Volume slider adjusts output level
4. ✅ Tone changes when circuit values change (resistor, voltage)
5. ✅ Audio stops when speaker removed or circuit opened
6. ✅ Multiple speakers can play simultaneously
7. ✅ No audio glitches during circuit edits
8. ✅ Works across major browsers (Chrome, Firefox, Safari, Edge)
9. ✅ Default state is muted (no unexpected sound)
10. ✅ Clear visual indicator when audio is active

This task transforms the speaker component from a decorative placeholder into a functional educational tool, completing the "real-world parts" promise and providing unique multi-sensory learning experiences.
