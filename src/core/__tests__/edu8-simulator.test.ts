import { describe, it, expect } from 'vitest';
import {
  createInitialEDU8State,
  resetEDU8,
  loadProgram,
  decodeInstruction,
  formatInstruction,
  executeInstruction,
  PRESET_PROGRAMS,
} from '../edu8-simulator';

describe('EDU-8 Simulator', () => {
  describe('State Management', () => {
    it('should create initial state with zeros', () => {
      const state = createInitialEDU8State();
      expect(state.accumulator).toBe(0);
      expect(state.programCounter).toBe(0);
      expect(state.zeroFlag).toBe(false);
      expect(state.halted).toBe(false);
      expect(state.inputs).toBe(0);
      expect(state.outputs).toBe(0);
      expect(state.rom.length).toBe(16);
    });

    it('should reset state while preserving ROM', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x01, 0x02, 0x03]);
      state = {
        ...state,
        accumulator: 42,
        programCounter: 5,
        outputs: 7,
        halted: true,
      };

      const resetState = resetEDU8(state);
      expect(resetState.accumulator).toBe(0);
      expect(resetState.programCounter).toBe(0);
      expect(resetState.outputs).toBe(0);
      expect(resetState.halted).toBe(false);
      expect(resetState.rom[0]).toBe(0x01); // ROM preserved
      expect(resetState.rom[1]).toBe(0x02);
    });

    it('should load program into ROM', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x10, 0x20, 0x30, 0x40]);
      expect(state.rom[0]).toBe(0x10);
      expect(state.rom[1]).toBe(0x20);
      expect(state.rom[2]).toBe(0x30);
      expect(state.rom[3]).toBe(0x40);
    });

    it('should truncate program if longer than 16 bytes', () => {
      let state = createInitialEDU8State();
      const longProgram = new Array(20).fill(0xff);
      state = loadProgram(state, longProgram);
      expect(state.rom.length).toBe(16);
    });
  });

  describe('Instruction Decoding', () => {
    it('should decode instruction into opcode and operand', () => {
      expect(decodeInstruction(0x01)).toEqual({ opcode: 0x0, operand: 0x1 });
      expect(decodeInstruction(0x35)).toEqual({ opcode: 0x3, operand: 0x5 });
      expect(decodeInstruction(0xf0)).toEqual({ opcode: 0xf, operand: 0x0 });
    });

    it('should format LDA instruction with immediate', () => {
      expect(formatInstruction(0x05)).toBe('LDA #5');
    });

    it('should format ADD instruction with immediate', () => {
      expect(formatInstruction(0x13)).toBe('ADD #3');
    });

    it('should format JMP instruction with address', () => {
      expect(formatInstruction(0x5a)).toBe('JMP 10');
    });

    it('should format JZ instruction with address', () => {
      expect(formatInstruction(0x47)).toBe('JZ 7');
    });

    it('should format IN/OUT/HALT without operand', () => {
      expect(formatInstruction(0x20)).toBe('IN');
      expect(formatInstruction(0x30)).toBe('OUT');
      expect(formatInstruction(0xf0)).toBe('HALT');
    });
  });

  describe('Instruction Execution', () => {
    it('should execute LDA (Load Accumulator)', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x05]); // LDA #5

      state = executeInstruction(state, 0);
      expect(state.accumulator).toBe(5);
      expect(state.programCounter).toBe(1);
      expect(state.zeroFlag).toBe(false);
    });

    it('should set zero flag when LDA loads zero', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x00]); // LDA #0

      state = executeInstruction(state, 0);
      expect(state.accumulator).toBe(0);
      expect(state.zeroFlag).toBe(true);
    });

    it('should execute ADD (Add Immediate)', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x05, 0x13]); // LDA #5, ADD #3

      state = executeInstruction(state, 0); // Execute LDA
      state = executeInstruction(state, 0); // Execute ADD
      expect(state.accumulator).toBe(8);
      expect(state.programCounter).toBe(2);
    });

    it('should wrap accumulator on overflow', () => {
      let state = createInitialEDU8State();
      state = { ...state, accumulator: 250 };
      state = loadProgram(state, [0x10]); // ADD #0 (will be at PC=0 but we set accumulator manually)
      state.programCounter = 0;
      state = loadProgram(state, [0x1a]); // ADD #10

      state = executeInstruction(state, 0);
      expect(state.accumulator).toBe(4); // (250 + 10) & 0xff = 260 & 0xff = 4
    });

    it('should execute IN (Input from Port)', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x20]); // IN

      state = executeInstruction(state, 0b1010); // Input = 10
      expect(state.accumulator).toBe(10);
      expect(state.inputs).toBe(10);
      expect(state.programCounter).toBe(1);
    });

    it('should execute OUT (Output to Port)', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x05, 0x30]); // LDA #5, OUT

      state = executeInstruction(state, 0);
      state = executeInstruction(state, 0);
      expect(state.outputs).toBe(5);
      expect(state.programCounter).toBe(2);
    });

    it('should execute JZ (Jump if Zero) when zero flag is set', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x00, 0x4a]); // LDA #0, JZ 10

      state = executeInstruction(state, 0); // LDA sets zero flag
      expect(state.zeroFlag).toBe(true);
      state = executeInstruction(state, 0); // JZ should jump
      expect(state.programCounter).toBe(10);
    });

    it('should not jump on JZ when zero flag is not set', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x05, 0x4a]); // LDA #5, JZ 10

      state = executeInstruction(state, 0); // LDA does not set zero flag
      expect(state.zeroFlag).toBe(false);
      state = executeInstruction(state, 0); // JZ should not jump
      expect(state.programCounter).toBe(2);
    });

    it('should execute JMP (Unconditional Jump)', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x57]); // JMP 7

      state = executeInstruction(state, 0);
      expect(state.programCounter).toBe(7);
    });

    it('should execute HALT and stop execution', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0xf0]); // HALT

      state = executeInstruction(state, 0);
      expect(state.halted).toBe(true);
    });

    it('should not execute instructions when halted', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, [0x05, 0x30]); // LDA #5, OUT
      state = { ...state, halted: true };

      const initialState = { ...state };
      state = executeInstruction(state, 0);
      expect(state.accumulator).toBe(initialState.accumulator);
      expect(state.programCounter).toBe(initialState.programCounter);
    });

    it('should wrap program counter at 16', () => {
      let state = createInitialEDU8State();
      state = { ...state, programCounter: 15 };
      state = loadProgram(state, new Array(16).fill(0x11)); // All ADD #1

      state = executeInstruction(state, 0);
      expect(state.programCounter).toBe(0); // Wrapped to 0
    });
  });

  describe('Preset Programs', () => {
    it('should have blink program', () => {
      expect(PRESET_PROGRAMS.blink).toBeDefined();
      expect(PRESET_PROGRAMS.blink.length).toBe(16);
    });

    it('should execute blink program correctly', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, PRESET_PROGRAMS.blink);

      // Cycle 1: LDA #1
      state = executeInstruction(state, 0);
      expect(state.accumulator).toBe(1);
      expect(state.programCounter).toBe(1);

      // Cycle 2: OUT (output 1)
      state = executeInstruction(state, 0);
      expect(state.outputs).toBe(1);
      expect(state.programCounter).toBe(2);

      // Cycle 3: LDA #0
      state = executeInstruction(state, 0);
      expect(state.accumulator).toBe(0);
      expect(state.programCounter).toBe(3);

      // Cycle 4: OUT (output 0)
      state = executeInstruction(state, 0);
      expect(state.outputs).toBe(0);
      expect(state.programCounter).toBe(4);

      // Cycle 5: JMP 0
      state = executeInstruction(state, 0);
      expect(state.programCounter).toBe(0); // Back to start
    });

    it('should have counter program', () => {
      expect(PRESET_PROGRAMS.counter).toBeDefined();
      expect(PRESET_PROGRAMS.counter.length).toBe(16);
    });

    it('should execute counter program correctly', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, PRESET_PROGRAMS.counter);

      // Execute several cycles
      state = executeInstruction(state, 0); // LDA #0
      expect(state.accumulator).toBe(0);

      state = executeInstruction(state, 0); // OUT
      expect(state.outputs).toBe(0);

      state = executeInstruction(state, 0); // ADD #1
      expect(state.accumulator).toBe(1);

      state = executeInstruction(state, 0); // JMP 1
      expect(state.programCounter).toBe(1);

      state = executeInstruction(state, 0); // OUT
      expect(state.outputs).toBe(1);

      state = executeInstruction(state, 0); // ADD #1
      expect(state.accumulator).toBe(2);
    });

    it('should have echo program', () => {
      expect(PRESET_PROGRAMS.echo).toBeDefined();
      expect(PRESET_PROGRAMS.echo.length).toBe(16);
    });

    it('should execute echo program correctly', () => {
      let state = createInitialEDU8State();
      state = loadProgram(state, PRESET_PROGRAMS.echo);

      // IN reads inputs
      state = executeInstruction(state, 0b1010);
      expect(state.accumulator).toBe(10);

      // OUT writes to outputs
      state = executeInstruction(state, 0b1010);
      expect(state.outputs).toBe(10);

      // JMP back to start
      state = executeInstruction(state, 0);
      expect(state.programCounter).toBe(0);

      // Try different input
      state = executeInstruction(state, 0b0101);
      expect(state.accumulator).toBe(5);
      state = executeInstruction(state, 0b0101);
      expect(state.outputs).toBe(5);
    });

    it('should have pattern program', () => {
      expect(PRESET_PROGRAMS.pattern).toBeDefined();
      expect(PRESET_PROGRAMS.pattern.length).toBe(16);
    });
  });
});
