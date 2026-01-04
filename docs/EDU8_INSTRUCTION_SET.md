# EDU-8 Microprocessor Instruction Set Reference

## Overview

The EDU-8 is an educational 8-bit microprocessor designed for teaching computational electronics. It features a minimal instruction set that is easy to understand and debug while being powerful enough to create interesting programs.

## Architecture

### Registers

- **Accumulator (A):** 8-bit general-purpose register for arithmetic and logic operations
- **Program Counter (PC):** 4-bit counter (0-15) pointing to the current instruction in ROM
- **Zero Flag (Z):** Boolean flag set when the accumulator equals zero

### Memory

- **ROM:** 16 bytes of program memory (instructions)
- **No RAM:** The EDU-8 is intentionally simple with no data memory

### I/O Ports

- **Input Port (IN0-3):** 4-bit input, reads digital voltage levels from circuit
- **Output Port (OUT0-3):** 4-bit output, drives digital voltage levels to circuit
- **HALT:** Single output pin indicating halted state

### Control Signals

- **CLK:** Clock input (execution on rising edge)
- **RST:** Reset input (active high, resets CPU state)
- **VCC/GND:** Power supply (3.0V - 5.5V typical)

## Instruction Format

Each instruction is 8 bits:
- **Bits 7-4:** Opcode (4-bit instruction identifier)
- **Bits 3-0:** Operand (4-bit immediate value or address)

Example: `0x35` = opcode `0x3` (OUT), operand `0x5` (unused by OUT)

## Instruction Set

### 1. LDA - Load Accumulator

**Opcode:** `0x0`  
**Format:** `LDA #imm4`  
**Operation:** `A ← imm4`  
**Flags:** Sets Z if result is zero

Loads a 4-bit immediate value into the accumulator (extended to 8 bits).

**Example:**
```assembly
0x05  ; LDA #5    → A = 5, Z = 0
0x00  ; LDA #0    → A = 0, Z = 1
```

### 2. ADD - Add Immediate

**Opcode:** `0x1`  
**Format:** `ADD #imm4`  
**Operation:** `A ← (A + imm4) & 0xFF`  
**Flags:** Sets Z if result is zero

Adds a 4-bit immediate value to the accumulator (8-bit wrap-around).

### 3. IN - Input from Port

**Opcode:** `0x2`  
**Format:** `IN`  
**Operation:** `A ← INPUT_PORT`  
**Flags:** Sets Z if input is zero

Reads the 4-bit input port (IN0-3) into the accumulator.

### 4. OUT - Output to Port

**Opcode:** `0x3`  
**Format:** `OUT`  
**Operation:** `OUTPUT_PORT ← A & 0x0F`  
**Flags:** None

Outputs the lower 4 bits of the accumulator to the output port (OUT0-3).

### 5. JZ - Jump if Zero

**Opcode:** `0x4`  
**Format:** `JZ addr4`  
**Operation:** `if (Z == 1) then PC ← addr4 else PC ← PC + 1`  
**Flags:** None

Jumps to the specified 4-bit address if the zero flag is set.

### 6. JMP - Unconditional Jump

**Opcode:** `0x5`  
**Format:** `JMP addr4`  
**Operation:** `PC ← addr4`  
**Flags:** None

Unconditionally jumps to the specified 4-bit address.

### 7. HALT - Halt Execution

**Opcode:** `0xF`  
**Format:** `HALT`  
**Operation:** `HALTED ← true`  
**Flags:** None

Stops execution until reset.

## Example Programs

### Blink (Toggle OUT0)
```
0x01  ; LDA #1
0x30  ; OUT
0x00  ; LDA #0
0x30  ; OUT
0x50  ; JMP 0
```

### Counter (0-15)
```
0x00  ; LDA #0
0x30  ; OUT
0x11  ; ADD #1
0x51  ; JMP 1
```

### Echo (Input → Output)
```
0x20  ; IN
0x30  ; OUT
0x50  ; JMP 0
```

## Educational Applications

- Understand fetch-decode-execute cycle
- Learn machine code and binary representation
- See connection between software and hardware
- Debug programs by observing CPU state in Explain panel
- Build interactive circuits with programmable behavior

## References

- Implementation: `src/core/edu8-simulator.ts`
- Electrical specs: `COMPONENT_LIBRARY.md`
- Planning: `planning/vision/goal.md` (lines 366-394)
