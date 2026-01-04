/**
 * EDU-8 Microprocessor Simulator
 * 
 * A simple educational 8-bit microprocessor with:
 * - 8-bit accumulator
 * - 4-bit program counter (16 instruction program)
 * - 4-bit input and output ports
 * - Minimal instruction set for teaching purposes
 */

import type { EDU8State } from './types';

/**
 * EDU-8 Instruction Set
 * Each instruction is 8 bits: 4-bit opcode + 4-bit operand
 */
export enum EDU8Opcode {
  LDA = 0x0, // LDA imm4  - Load accumulator with immediate value
  ADD = 0x1, // ADD imm4  - Add immediate value to accumulator
  IN = 0x2,  // IN        - Load accumulator from input port
  OUT = 0x3, // OUT       - Output accumulator to output port
  JZ = 0x4,  // JZ addr4  - Jump if zero flag set
  JMP = 0x5, // JMP addr4 - Unconditional jump
  HALT = 0xF // HALT      - Stop execution
}

/**
 * Instruction mnemonics for display
 */
export const INSTRUCTION_NAMES: Record<number, string> = {
  [EDU8Opcode.LDA]: 'LDA',
  [EDU8Opcode.ADD]: 'ADD',
  [EDU8Opcode.IN]: 'IN',
  [EDU8Opcode.OUT]: 'OUT',
  [EDU8Opcode.JZ]: 'JZ',
  [EDU8Opcode.JMP]: 'JMP',
  [EDU8Opcode.HALT]: 'HALT',
};

/**
 * Create initial EDU-8 state
 */
export function createInitialEDU8State(): EDU8State {
  return {
    accumulator: 0,
    programCounter: 0,
    zeroFlag: false,
    halted: false,
    rom: new Uint8Array(16), // 16 bytes of program memory
    inputs: 0,
    outputs: 0,
    clockState: false,
  };
}

/**
 * Reset EDU-8 to initial state (preserves ROM)
 */
export function resetEDU8(state: EDU8State): EDU8State {
  return {
    ...state,
    accumulator: 0,
    programCounter: 0,
    zeroFlag: false,
    halted: false,
    inputs: 0,
    outputs: 0,
    clockState: false,
  };
}

/**
 * Load program into ROM
 */
export function loadProgram(state: EDU8State, program: number[]): EDU8State {
  const rom = new Uint8Array(16);
  for (let i = 0; i < Math.min(program.length, 16); i++) {
    rom[i] = program[i] & 0xff; // Ensure 8-bit values
  }
  return { ...state, rom };
}

/**
 * Decode instruction into opcode and operand
 */
export function decodeInstruction(instruction: number): { opcode: number; operand: number } {
  return {
    opcode: (instruction >> 4) & 0x0f,
    operand: instruction & 0x0f,
  };
}

/**
 * Get instruction mnemonic with operand
 */
export function formatInstruction(instruction: number): string {
  const { opcode, operand } = decodeInstruction(instruction);
  const name = INSTRUCTION_NAMES[opcode] || 'UNK';
  
  // Instructions that use operand as immediate value
  if (opcode === EDU8Opcode.LDA || opcode === EDU8Opcode.ADD) {
    return `${name} #${operand}`;
  }
  
  // Instructions that use operand as address
  if (opcode === EDU8Opcode.JZ || opcode === EDU8Opcode.JMP) {
    return `${name} ${operand}`;
  }
  
  // Instructions with no operand
  return name;
}

/**
 * Execute one instruction (called on clock rising edge)
 */
export function executeInstruction(state: EDU8State, inputs: number): EDU8State {
  // Don't execute if halted
  if (state.halted) {
    return state;
  }

  // Fetch instruction
  const instruction = state.rom[state.programCounter];
  const { opcode, operand } = decodeInstruction(instruction);

  // Create new state
  const newState = { ...state, inputs: inputs & 0x0f };
  let accumulator = state.accumulator;
  let pc = state.programCounter;
  let outputs = state.outputs;
  let halted = false;
  let zeroFlag = state.zeroFlag;

  // Execute based on opcode
  switch (opcode) {
    case EDU8Opcode.LDA:
      // Load accumulator with immediate value
      accumulator = operand & 0x0f; // 4-bit immediate, extends to 8-bit
      zeroFlag = accumulator === 0;
      pc = (pc + 1) & 0x0f;
      break;

    case EDU8Opcode.ADD:
      // Add immediate to accumulator
      accumulator = (accumulator + operand) & 0xff; // 8-bit wrap
      zeroFlag = accumulator === 0;
      pc = (pc + 1) & 0x0f;
      break;

    case EDU8Opcode.IN:
      // Load accumulator from input port
      accumulator = inputs & 0x0f;
      zeroFlag = accumulator === 0;
      pc = (pc + 1) & 0x0f;
      break;

    case EDU8Opcode.OUT:
      // Output accumulator to output port (lower 4 bits)
      outputs = accumulator & 0x0f;
      pc = (pc + 1) & 0x0f;
      break;

    case EDU8Opcode.JZ:
      // Jump if zero flag set
      if (zeroFlag) {
        pc = operand & 0x0f;
      } else {
        pc = (pc + 1) & 0x0f;
      }
      break;

    case EDU8Opcode.JMP:
      // Unconditional jump
      pc = operand & 0x0f;
      break;

    case EDU8Opcode.HALT:
      // Stop execution
      halted = true;
      break;

    default:
      // Unknown instruction - treat as NOP
      pc = (pc + 1) & 0x0f;
      break;
  }

  return {
    ...newState,
    accumulator,
    programCounter: pc,
    zeroFlag,
    halted,
    outputs,
  };
}

/**
 * Preset programs for educational use
 */
export const PRESET_PROGRAMS = {
  /**
   * Blink: Toggle OUT0 on each clock cycle
   * Program:
   *   0: LDA #1    - Load 1 into accumulator
   *   1: OUT       - Output to OUT (OUT0 = 1)
   *   2: LDA #0    - Load 0 into accumulator
   *   3: OUT       - Output to OUT (OUT0 = 0)
   *   4: JMP 0     - Jump back to start
   */
  blink: [
    0x01, // LDA #1
    0x30, // OUT
    0x00, // LDA #0
    0x30, // OUT
    0x50, // JMP 0
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ],

  /**
   * Counter: Count up on outputs (0-15, then wrap)
   * Program:
   *   0: LDA #0    - Start at 0
   *   1: OUT       - Output current value
   *   2: ADD #1    - Increment
   *   3: JMP 1     - Loop
   */
  counter: [
    0x00, // LDA #0
    0x30, // OUT
    0x11, // ADD #1
    0x51, // JMP 1
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ],

  /**
   * Echo: Copy inputs to outputs
   * Program:
   *   0: IN        - Read inputs
   *   1: OUT       - Write to outputs
   *   2: JMP 0     - Loop
   */
  echo: [
    0x20, // IN
    0x30, // OUT
    0x50, // JMP 0
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ],

  /**
   * Pattern: Output a repeating pattern (0xA, 0x5)
   * Program:
   *   0: LDA #10   - Load 0xA
   *   1: OUT       - Output
   *   2: LDA #5    - Load 0x5
   *   3: OUT       - Output
   *   4: JMP 0     - Loop
   */
  pattern: [
    0x0a, // LDA #10 (0xA)
    0x30, // OUT
    0x05, // LDA #5
    0x30, // OUT
    0x50, // JMP 0
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ],
};
