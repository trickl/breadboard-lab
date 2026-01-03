Implement real-world component library with physically accurate parts

## Context

Breadboard Lab currently provides five abstract component types (Wire, Resistor, LED, Power Supply, Ground) with configurable parameters like resistance and voltage. However, real electronics education and prototyping work with **specific, purchasable components** that have defined physical characteristics, electrical specifications, and part numbers.

The current abstract approach limits educational authenticity and doesn't reflect how electronics are actually learned and used. When students move from Breadboard Lab to physical breadboards, they need to know **which specific resistor to buy** (not just "a 220Ω resistor") and **which LED** (3mm vs 5mm, red vs ultra-bright yellow).

## Gap Analysis

**What the planning document specifies** (goal.md, Section 4: "Component Library (Real-World Parts)"):

> "The system provides a first-class Component Library containing real, purchasable components. Component selection is by specification (package/size/ratings/characteristics), not only by abstract type."

Required capabilities:
- Library entries with stable IDs
- Physical attributes: package size, form factor, footprint/pin roles
- Electrical characteristics required by solver
- Manufacturer/part family metadata (optional but encouraged)
- Explicit examples to include:
  - "3mm ultra-bright yellow LED"
  - "Standard through-hole resistors (axial, 1/4W, 1% and 5% variants)"
  - "Small breadboard-compatible speakers (8Ω module or equivalent)"

**What we currently have** (system_capabilities.md):

- Five component types with generic parameters
- Resistors: configurable resistance (any value > 0Ω), fixed 5% tolerance
- LEDs: configurable forward voltage (0.1-5V), max current 0.02A
- No physical dimensions or package information
- No manufacturer data or part numbers
- No component library UI (components selected by abstract type only)
- No real-world part specifications

**The gap**: We have abstract component types, but we need a **structured component library** with real-world parts that students can actually buy and use.

## Proposed Task

Implement a component library system that replaces abstract component types with real, physically accurate parts that have:
1. Defined package types and physical dimensions
2. Specific electrical characteristics
3. Manufacturer/part family information (where applicable)
4. Educational metadata (common uses, typical applications)
5. A library selection UI that presents parts by specification

### Core Components

1. **Component Library Data Model**
   - Implement `ComponentLibraryEntry` interface from goal.md (lines 236-254):
     - `id`, `name`, `category`, `manufacturer`, `partFamily`
     - `package` (kind, pinCount, dimensions)
     - `footprint` (pin definitions and roles)
     - `electrical` (component-specific parameters)
     - `visuals` (renderer type: procedural or SVG)
   - Create library data structure (JSON or TypeScript definitions)
   - Support component categories: passive, diode, transistor, ic, power, interconnect, electro-acoustic, virtual-educational

2. **Initial Library Catalog**
   - Add the three explicitly required components from goal.md:
     - **LED**: 3mm ultra-bright yellow LED (e.g., based on common datasheets: Vf=2.0-2.2V, If=20mA, package: T1 3mm)
     - **Resistor**: Standard 1/4W through-hole resistors (axial package)
       - Add multiple values from E12 series (100Ω, 220Ω, 470Ω, 1kΩ, 2.2kΩ, 4.7kΩ, 10kΩ, etc.)
       - Support both 5% tolerance (4-band) and 1% tolerance (5-band) variants
       - Physical specs: body length ~6.5mm, lead spacing ~10mm (standard axial)
     - **Speaker**: Small breadboard-compatible 8Ω speaker module (foundation for future audio feature)
   - Add supporting components:
     - Red, green, blue 5mm LEDs (standard Vf values)
     - Additional wire types (solid core, various gauges)
     - Multiple power supply types (3.3V, 5V, 9V, 12V sources)

3. **Component Selection UI**
   - Replace abstract type buttons ("Resistor", "LED") with library browser
   - Display parts by specification: "220Ω 1/4W 5% Resistor (Brown-Red-Brown-Gold)"
   - Show physical attributes: package type, size, pin configuration
   - Show electrical specs: resistance/voltage/current ratings
   - Filter/search by category, value, package type
   - Preview of component appearance before placement

4. **Integration with Existing Systems**
   - Update placement system to use library IDs instead of abstract types
   - Extend component rendering to use library specifications:
     - Resistor visual size based on package (1/4W vs 1/2W)
     - LED size based on package (T1 3mm vs T1-3/4 5mm)
     - Accurate color band rendering from library tolerance values
   - Update property editor to show library part information
   - Extend serialization to store library references

5. **Backward Compatibility**
   - Provide migration path for existing saved circuits
   - Map old abstract components to library equivalents:
     - "RESISTOR with 220Ω" → "Standard 220Ω 1/4W 5% Axial Resistor"
     - "LED with 2.0V" → "Standard Red 5mm LED"
   - Ensure all example circuits load correctly with library parts

### Success Criteria

- [ ] Component library data structure implemented per goal.md specification
- [ ] At least 10 resistor values from E12 series included (both 5% and 1% variants)
- [ ] At least 4 LED types included (3mm yellow, 5mm red/green/blue)
- [ ] Speaker module entry included (foundation for audio feature)
- [ ] Component selection UI shows parts by specification (not abstract type)
- [ ] Physical dimensions displayed in component browser
- [ ] Resistor color bands reflect library tolerance values (4-band for 5%, 5-band for 1%)
- [ ] Component rendering adapts to library-specified package sizes
- [ ] Explain panel shows part number and manufacturer data (when available)
- [ ] All existing example circuits load correctly with library parts
- [ ] Property editor displays library part information
- [ ] Serialization preserves library references

### Implementation Approach

**Phase 1: Data Model and Library Infrastructure**
- Define `ComponentLibraryEntry` interface in `src/core/types.ts`
- Create `src/core/component-library.ts` module
- Implement library registry and lookup functions
- Add initial library entries (JSON or TypeScript data)

**Phase 2: Library Content**
- Add resistor entries (E12 series, multiple tolerances)
- Add LED entries (multiple colors and sizes)
- Add speaker module entry
- Add wire and power supply variants
- Include physical dimensions and electrical specs from datasheets

**Phase 3: UI Integration**
- Create component library browser UI (modal or panel)
- Replace abstract type buttons with "Browse Components" button
- Implement filtering and search
- Add visual previews of parts
- Update placement workflow to use library IDs

**Phase 4: Rendering and Display Updates**
- Extend `ComponentRenderer` to use library specifications
- Update resistor rendering to use library tolerance (4-band vs 5-band)
- Scale component visuals based on package dimensions
- Update explain panel to show library metadata

**Phase 5: Serialization and Migration**
- Extend serialization format to include library references
- Implement migration function for old circuits
- Update example circuits to use library parts
- Test backward compatibility

**Phase 6: Testing and Polish**
- Unit tests for library lookup functions
- UI tests for component browser
- Visual regression tests for library-specified rendering
- Documentation updates

### Alignment with Vision

This task directly addresses multiple goals from the planning document:

- **Educational authenticity** (goal.md): "Component selection is by specification (package/size/ratings/characteristics), not only by abstract type"
- **Real-world bridging**: Students learn which actual parts to purchase for physical prototyping
- **Explicit requirement**: Three specific components are mandated in goal.md Section 4
- **Foundation for future features**: 
  - Speaker component enables audio output (goal.md Section 7)
  - Structured library enables more component types (transistors, ICs)
  - Physical dimensions enable realistic rendering requirements (goal.md Section 3)
- **Resistor color code education**: Library tolerance values enable proper 4-band vs 5-band rendering

### Priority Justification

This task is the next logical step because:

1. **Explicit in planning document**: Section 4 of goal.md mandates this feature with specific examples
2. **Educational impact**: Bridges simulation to real-world prototyping
3. **Foundation for v0.2 features**: Required before audio output, more component types, realistic rendering
4. **MVP completion**: Listed as part of target system specification
5. **Leverages existing work**: Resistor color code system (PR #137) ready to use library tolerance values
6. **Natural progression**: Core interactions complete, visualizations complete, now enhance component fidelity

The system has strong fundamentals (interaction model, simulation, visualization, error detection). Implementing the real-world component library is the natural next step to elevate the educational value and prepare for advanced features in v0.2 (audio output, schematic view, more component types).

### Estimated Effort

1-2 weeks of focused development:
- Days 1-2: Data model and library infrastructure
- Days 3-4: Library content (resistors, LEDs, speaker)
- Days 5-6: Component browser UI
- Days 7-8: Rendering and display updates
- Days 9-10: Serialization, migration, testing

### Dependencies

- Resistor color code system ✅ (implemented in PR #137)
- Component rendering system ✅ (implemented in PR #71, updated in multiple PRs)
- Property editor ✅ (implemented in PR #95)
- Explain panel ✅ (implemented in PR #113)
- Serialization system ✅ (implemented in PR #119)

### Risks

- **Library data maintenance**: Large component catalogs need curation
  - *Mitigation*: Start small (10-20 parts), expand incrementally
- **UI complexity**: Component browser may clutter interface
  - *Mitigation*: Modal/drawer design keeps main UI clean
- **Backward compatibility**: Old circuits need migration
  - *Mitigation*: Implement automatic migration with fallbacks
- **Datasheet accuracy**: Physical/electrical specs must be correct
  - *Mitigation*: Use standard datasheets, cite sources in library entries

### Deferred Features

This task does **NOT** include:
- Audio output implementation (future task, requires Web Audio API integration)
- User-defined custom components (v0.2+)
- Component marketplace or sharing (v0.3+)
- Advanced component types (transistors, ICs beyond simple ones)
- Schematic view (separate v0.2 task)
- Photorealistic component rendering (current procedural rendering sufficient)

### References

- `planning/vision/goal.md` - Section 4: "Component Library (Real-World Parts)"
- `planning/state/system_capabilities.md` - Section "Component Library" (current abstract types)
- `src/core/resistor-color-code.ts` - Existing color code system ready for library tolerance values
- `src/ui/component-renderer.ts` - Rendering system to extend with library specs
- Real-world datasheets for standard parts (to be referenced in library entries)

## Why This Task Matters

Without a real-world component library, Breadboard Lab teaches **abstract electronics** (resistors, LEDs) rather than **practical electronics** (220Ω 1/4W resistor, 3mm yellow LED). Students using the tool won't know what to buy when they move to physical breadboards.

This gap between simulation and reality undermines the educational mission. Implementing the component library transforms Breadboard Lab from a circuit simulator into a **practical electronics education tool** that directly connects to real-world prototyping.

This is the single most important enhancement to the system's educational value, and it's explicitly required in the planning document.
