# Component Library System

## Overview

The Component Library system provides a structured catalog of real-world electronic components with physically accurate specifications. This replaces the previous abstract component types with actual parts that students can purchase and use in physical breadboarding.

## Architecture

### Core Components

1. **`ComponentLibraryEntry` interface** (`src/core/types.ts`)
   - Represents a real-world component with:
     - Physical specifications (package type, dimensions, pin configuration)
     - Electrical characteristics (resistance, voltage, current ratings)
     - Manufacturer metadata (optional)
     - Educational metadata (description, typical uses)

2. **Component Library Registry** (`src/core/component-library.ts`)
   - Central registry for all component entries
   - Provides lookup, search, and filtering capabilities
   - Singleton instance: `componentLibrary`

3. **Library Catalog** (`src/library/`)
   - Real-world component definitions organized by type:
     - **Resistors** (23 entries): E12 series, 5% and 1% tolerance
     - **LEDs** (4 entries): 3mm yellow, 5mm red/green/blue
     - **Switches** (1 entry): SPST toggle switch
     - **Speaker** (1 entry): 8Ω breadboard module
     - **Power Supplies** (4 entries): 3.3V, 5V, 9V, 12V
     - **Wires** (2 entries): 22 AWG red/black
     - **Ground** (1 entry): Reference point
     - **Microprocessors** (1 entry): EDU-8 educational processor
   - Total: 37 component entries

4. **Library Utilities** (`src/core/component-library-utils.ts`)
   - Helper functions for mapping between abstract components and library entries
   - Provides backward compatibility
   - Functions for finding closest matches

### Backward Compatibility

The system maintains 100% backward compatibility with existing circuits:

- Components have an optional `libraryId` field
- Existing components without `libraryId` continue to work
- Utility functions can map abstract components to library equivalents
- `getDefaultLibraryId()` finds best-match library entries for any component

## Library Catalog

### Resistors (23 entries)

**5% Tolerance (16 entries):**
- E12 series: 100Ω, 120Ω, 150Ω, 180Ω, 220Ω, 270Ω, 330Ω, 390Ω, 470Ω, 560Ω, 680Ω, 820Ω, 1kΩ, 2.2kΩ, 4.7kΩ, 10kΩ
- Package: Axial, 1/4W
- Physical: 6.5mm body, 10mm lead spacing
- Color code: 4-band

**1% Tolerance (7 entries):**
- Values: 100Ω, 220Ω, 470Ω, 1kΩ, 2.2kΩ, 4.7kΩ, 10kΩ
- Package: Axial, 1/4W
- Physical: Same as 5% tolerance
- Color code: 5-band

### LEDs (4 entries)

1. **3mm Ultra-Bright Yellow LED** *(required by goal.md)*
   - Forward voltage: 2.1V
   - Max current: 20mA
   - Package: T1 (3mm)
   - Wavelength: 590nm

2. **5mm Red LED**
   - Forward voltage: 1.9V
   - Max current: 20mA
   - Package: T1-3/4 (5mm)
   - Wavelength: 625nm

3. **5mm Green LED**
   - Forward voltage: 2.1V
   - Max current: 20mA
   - Package: T1-3/4 (5mm)
   - Wavelength: 525nm

4. **5mm Blue LED**
   - Forward voltage: 3.1V
   - Max current: 20mA
   - Package: T1-3/4 (5mm)
   - Wavelength: 470nm

### Switches (1 entry)

**SPST Toggle Switch** *(required by goal.md Section 12.2)*
- Type: Single-pole single-throw (SPST)
- Contact resistance: 0.01Ω (closed), 1GΩ (open)
- Voltage rating: 250V AC
- Current rating: 3A
- Operating force: 150g
- Lifecycle: 10,000 operations
- Contact material: Silver
- Package: Through-hole, 2-pin, 5.08mm (0.2") spacing
- Interactive: Click to toggle between open and closed states
- Visual indicator: Orange (open) / Green (closed)
- Typical uses:
  - Manual circuit control
  - Power on/off switching
  - Input device for digital circuits
  - Series/parallel switch configurations

### Speaker (1 entry)

**8Ω Breadboard Speaker Module** *(required by goal.md)*
- Impedance: 8Ω
- Power rating: 0.5W
- Frequency response: 300Hz-5kHz
- Package: Module (23mm diameter)

### Power Supplies (4 entries)

- 3.3V (1A max)
- 5.0V (2A max)
- 9.0V (1A max)
- 12.0V (2A max)

### Wires (2 entries)

- 22 AWG Solid Core Wire (Red)
- 22 AWG Solid Core Wire (Black)

### Ground (1 entry)

- Ground Reference (0V)

## Usage

### Accessing the Library

```typescript
import { componentLibrary } from '@/core/component-library';
import { ALL_LIBRARY_ENTRIES } from '@/library';

// Initialize library (typically at app startup)
ALL_LIBRARY_ENTRIES.forEach(entry => {
  componentLibrary.register(entry);
});

// Get a specific component
const resistor = componentLibrary.get('resistor-220-5pct');

// Get all resistors
const resistors = componentLibrary.getByCategory('passive');

// Search for components
const yellowLEDs = componentLibrary.search('yellow');

// Get all components
const allComponents = componentLibrary.getAll();
```

### Finding Library Matches

```typescript
import {
  findClosestResistor,
  findClosestLED,
  findPowerSupply,
  getDefaultLibraryId,
} from '@/core/component-library-utils';

// Find closest resistor to a value
const resistorId = findClosestResistor(250, 5); // Returns closest 5% resistor

// Find LED by forward voltage
const ledId = findClosestLED(2.0); // Returns closest matching LED

// Find power supply by voltage
const powerId = findPowerSupply(5.0); // Returns exact match or undefined

// Get library ID for any component
const libId = getDefaultLibraryId(component); // Finds best match
```

### Using Library Components

```typescript
import type { Resistor } from '@/core/types';
import { ComponentType } from '@/core/types';

// Create a component with library reference
const resistor: Resistor = {
  id: 'comp-1',
  type: ComponentType.RESISTOR,
  positions: [{ row: 0, col: 2 }, { row: 0, col: 6 }],
  rotation: 0,
  resistance: 220,
  libraryId: 'resistor-220-5pct', // Links to library entry
};

// Get properties from library
import { getComponentPropertiesFromLibrary } from '@/core/component-library-utils';
const props = getComponentPropertiesFromLibrary(resistor);
// props.resistance will be 220 from library entry
```

## Integration Points

### 1. Component Selection UI

**Current:** Abstract type buttons (Wire, Resistor, LED, Power, Ground)

**Future:** Component browser showing library entries
- Display by category (passive, diode, power, etc.)
- Show specifications (resistance, voltage, package size)
- Search and filter capabilities
- Visual previews

**Integration approach:**
- Replace component type buttons with "Browse Components" button
- Create modal/panel with library entries
- On selection, create component with `libraryId` set

### 2. Component Rendering

**Current:** Generic rendering based on component type

**Future:** Library-aware rendering
- Scale visuals based on package dimensions (3mm vs 5mm LEDs)
- Use library tolerance for resistor color bands (4-band vs 5-band)
- Display manufacturer info in tooltips

**Integration approach:**
- Update `ComponentRenderer` to check for `libraryId`
- Look up library entry for rendering parameters
- Fall back to component properties if no library entry

### 3. Property Editor

**Current:** Editable numeric values (resistance, voltage)

**Future:** Library-aware editing
- Show part name and specifications
- Display manufacturer/part number
- Link to datasheet (future)
- Option to switch to different library part

**Integration approach:**
- Update property editor to show library metadata
- Add "Change Part" button to swap library entry
- Update `libraryId` and electrical properties together

### 4. Explain Panel

**Current:** Shows component type and electrical properties

**Future:** Enhanced with library metadata
- Display part name and manufacturer
- Show physical specifications
- List typical uses
- Educational context from library entry

**Integration approach:**
- Update explain panel content generation
- Include library entry data when available
- Maintain fallback to generic descriptions

### 5. Serialization

**Current:** Saves component type and electrical properties

**Future:** Save library references
- Include `libraryId` in serialized format
- Library entry provides all specifications on load
- Enables consistent behavior across saves

**Integration approach:**
- `libraryId` field already supported in serialization
- No schema changes required
- Backward compatible with old circuits

## Testing

### Test Coverage

- **Component Library Registry:** 13 tests
- **Library Catalog:** 18 tests
- **Library Utilities:** 19 tests
- **Total:** 50 new tests (all passing)

### Test Files

- `src/core/__tests__/component-library.test.ts`
- `src/library/__tests__/library-catalog.test.ts`
- `src/core/__tests__/component-library-utils.test.ts`

## Migration Strategy

### Phase 1: Foundation ✅ (This PR)
- Data model and infrastructure
- Library catalog with 35 real-world parts
- Utility functions for lookups and mapping
- Comprehensive test coverage
- 100% backward compatibility

### Phase 2: UI Integration (Future PR)
- Component library browser modal
- Update component selection workflow
- Library-aware rendering
- Update property editor and explain panel

### Phase 3: Migration Tools (Future PR)
- Automatic migration of old circuits to library parts
- Update example circuits
- Conversion utilities for bulk updates

### Phase 4: Enhanced Features (Future)
- User-defined custom components
- Import/export library entries
- Component marketplace/sharing
- Advanced search and filtering

## Key Design Decisions

### 1. Minimal Changes

This PR focuses on infrastructure without modifying existing UI/UX. This ensures:
- Zero risk of breaking existing functionality
- Clear separation of concerns
- Easier code review
- Foundation for incremental improvements

### 2. Backward Compatibility

The `libraryId` field is optional, allowing:
- Old circuits to load and work perfectly
- Gradual migration to library-based components
- Coexistence of abstract and library components
- No forced breaking changes

### 3. Catalog Scope

Started with essential components as specified in goal.md:
- 3mm yellow LED (explicitly required)
- Standard resistors (explicitly required)
- 8Ω speaker (explicitly required)
- Common supporting components

More components can be added incrementally without architectural changes.

### 4. Testing First

Comprehensive tests ensure:
- Library registry works correctly
- Catalog is valid and complete
- Utility functions behave as expected
- Integration points are well-defined

## Future Enhancements

### Planned Features

1. **Component Browser UI**
   - Modal or side panel
   - Category-based navigation
   - Search and filter
   - Visual previews
   - Specifications display

2. **Library-Aware Rendering**
   - Scale components by package size
   - Accurate color band rendering from tolerance
   - Package-specific visuals

3. **Migration Tools**
   - Convert old circuits to library parts
   - Batch update utilities
   - Smart matching algorithms

4. **Enhanced Metadata**
   - Datasheet links
   - Purchasing information
   - Typical circuit examples
   - Educational tutorials

5. **User Extensions**
   - Custom component definitions
   - Import/export library entries
   - Community-contributed parts

### Long-Term Vision

Transform Breadboard Lab from an abstract circuit simulator into a **practical electronics education tool** that directly connects simulation to real-world prototyping. Students learn:
- Which specific parts to purchase
- How to read datasheets
- Physical component characteristics
- Real-world design constraints

## Questions and Support

For questions about the component library system:
- Review the test files for usage examples
- See `src/library/` for component definitions
- Check utility functions in `component-library-utils.ts`

## Contributing

To add new components to the library:

1. Add entry to appropriate file in `src/library/`
2. Follow existing patterns (physical specs, electrical properties)
3. Include educational metadata (description, typical uses)
4. Add tests in `library-catalog.test.ts`
5. Verify with `npm test -- --run library-catalog`

Example:
```typescript
{
  id: 'resistor-47k-5pct',
  name: '47kΩ 1/4W 5% Resistor',
  category: 'passive',
  package: {
    kind: 'axial',
    pinCount: 2,
    leadSpacingMm: 10,
    body: { lengthMm: 6.5, widthMm: 2.5 },
  },
  footprint: {
    pins: [
      { pinId: 'pin1', role: 'terminal' },
      { pinId: 'pin2', role: 'terminal' },
    ],
  },
  electrical: {
    resistance: 47000,
    tolerance: 5,
    powerRating: 0.25,
  },
  visuals: { renderer: 'procedural' },
  description: 'Standard through-hole axial resistor, 47kΩ ±5%, 1/4W power rating, 4-band color code',
  typicalUses: ['Pull-up resistor', 'Voltage divider', 'Timing circuits'],
}
```

### Microprocessors (1 entry)

Educational virtual microprocessor for teaching computational electronics.

#### EDU-8 Microprocessor (Educational)

```typescript
{
  id: 'edu8-microprocessor',
  name: 'EDU-8 Microprocessor (Educational)',
  category: 'virtual-educational',
  package: {
    kind: 'dip',
    pinCount: 16,
    body: { lengthMm: 19.05, widthMm: 6.35, heightMm: 3.5 },
  },
  footprint: {
    pins: [
      { pinId: 'VCC', role: 'power' },
      { pinId: 'IN0', role: 'digital-input' },
      { pinId: 'IN1', role: 'digital-input' },
      { pinId: 'IN2', role: 'digital-input' },
      { pinId: 'IN3', role: 'digital-input' },
      { pinId: 'CLK', role: 'clock-input' },
      { pinId: 'RST', role: 'reset-input' },
      { pinId: 'GND', role: 'ground' },
      { pinId: 'HALT', role: 'digital-output' },
      { pinId: 'OUT0', role: 'digital-output' },
      { pinId: 'OUT1', role: 'digital-output' },
      { pinId: 'OUT2', role: 'digital-output' },
      { pinId: 'OUT3', role: 'digital-output' },
      { pinId: 'NC1', role: 'no-connect' },
      { pinId: 'NC2', role: 'no-connect' },
      { pinId: 'NC3', role: 'no-connect' },
    ],
  },
  electrical: {
    supplyVoltageMin: 3.0,
    supplyVoltageMax: 5.5,
    supplyVoltageTypical: 5.0,
    inputHighThreshold: 2.0,
    inputLowThreshold: 0.8,
    outputHighVoltage: 4.5,
    outputLowVoltage: 0.2,
    maxOutputCurrent: 0.020,
  },
  visuals: { renderer: 'procedural' },
  description: 'Educational 8-bit microprocessor with 4-bit I/O ports, clock-driven execution, and programmable ROM',
  typicalUses: [
    'Clock-driven LED patterns',
    'Binary counter displays',
    'Input-controlled logic',
    'Sequential state machines',
    'Introduction to embedded systems',
  ],
}
```

**EDU-8 Architecture:**
- **Accumulator:** 8-bit register for arithmetic and logic operations
- **Program Counter:** 4-bit counter (0-15) pointing to current instruction
- **ROM:** 16-byte program memory (programmable via property editor)
- **I/O Ports:** 4-bit input and 4-bit output (IN0-3, OUT0-3)
- **Flags:** Zero flag (Z) set when accumulator is zero
- **Execution:** One instruction per rising clock edge

**Instruction Set:**
1. `LDA imm4` - Load accumulator with 4-bit immediate value
2. `ADD imm4` - Add 4-bit immediate value to accumulator
3. `IN` - Load accumulator from input port (IN0-3)
4. `OUT` - Output accumulator to output port (OUT0-3, lower 4 bits)
5. `JZ addr4` - Jump to 4-bit address if zero flag is set
6. `JMP addr4` - Unconditional jump to 4-bit address
7. `HALT` - Stop execution until reset

**Example Programs:**
- **Blink:** Toggle OUT0 on each clock cycle
- **Counter:** Count up from 0-15 on outputs
- **Echo:** Copy input port to output port
- **Pattern:** Output alternating pattern (0xA, 0x5)

**Educational Value:**
The EDU-8 is intentionally simplified to be understandable by inspection. Students can:
- See exact internal state in Explain panel (PC, instruction, accumulator, flags)
- Step through programs one instruction at a time
- Understand connection between software (program) and hardware (I/O pins)
- Learn sequential logic and state machines
- Bridge between digital logic and embedded systems
