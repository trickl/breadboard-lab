Implement photorealistic breadboard rendering with physical accuracy and depth cues

## Context

The target system specification (goal.md v0.2) requires "photorealistic" 2D breadboard rendering with real physical structure including "subtle non-uniform spacing and physical cues (plastic ridges/troughs, labeling)". The current PixiJS renderer (PR #167) provides functional breadboard visualization using basic geometric shapes, but does not meet the photorealistic quality standard specified in the goal.

## Gap Analysis

**What the goal requires:**

- Photorealistic 2D (top-down) breadboard rendering
- Real physical structure: grouped holes, center gap, rail separations
- Subtle non-uniform spacing and physical cues (plastic ridges/troughs, labeling)
- Overlapping wires with visual unambiguity:
  - Wire shading/lighting indicates overlap ordering
  - Depth cues (z-order, shadowing, thickness) ensure crossings don't look like junctions
- Active LEDs emit a subtle glow derived from solver output

**What the system currently has:**

- PixiJS WebGL renderer with functional breadboard grid
- Basic geometric shapes for holes, wires, and components
- Voltage color overlays and current animation working
- Functional but not photorealistic visual appearance
- No wire depth visualization or lighting effects
- No LED glow effects (PixiJS filters available but not applied)
- No plastic texture or physical cues

**The gap:**
The visual quality of the breadboard rendering does not meet the "photorealistic" and "physical cues" requirements specified in goal.md. This affects both the educational value (students should see realistic-looking breadboards that match physical hardware) and the professional appearance of the tool.

## Proposed Development Task

**Enhance PixiJS breadboard renderer to achieve photorealistic visual quality with physical accuracy**

### Scope

Improve the visual rendering quality of the breadboard to meet the photorealistic standard specified in goal.md, focusing on:

1. **Breadboard substrate appearance:**
   - Realistic breadboard plastic texture (subtle color variation, material appearance)
   - Row/column labels (numbers 1-30, letters A-J) positioned accurately
   - Plastic ridges and troughs between strip groups
   - Center gap visual indication (physical separator appearance)
   - Rail visual separation with proper coloring (red for positive, blue/black for negative)

2. **Hole rendering improvements:**
   - Metal contact appearance within holes (subtle reflectivity, depth)
   - Consistent hole sizing and spacing based on real breadboard dimensions
   - Subtle depth indication (holes are recessed into plastic)

3. **Wire depth and crossing visualization:**
   - Z-order based layering for wire crossings
   - Wire shadowing or opacity variation to indicate depth
   - Visual distinction between wire crossings (no connection) and wire junctions (electrical connection)
   - Wire thickness variation based on depth order

4. **LED glow effects:**
   - Implement PixiJS BlurFilter or GlowFilter for active LEDs
   - Glow intensity proportional to simulated current/power
   - Color-accurate glow matching LED wavelength

5. **Component visual realism:**
   - Enhance resistor body rendering with more realistic appearance
   - LED casing with translucency and light emission
   - Improved power supply visual representation

### Success Criteria

- Breadboard appearance is recognizably photorealistic and matches real physical breadboards
- Wire crossings are visually unambiguous (clear distinction between crossings and connections)
- Active LEDs have subtle glow effect proportional to current
- Row/column labels are present and accurately positioned
- Plastic ridges/troughs provide visual structure to terminal strip groups
- Visual quality supports educational goal of preparing students for physical breadboard work

### Technical Approach

- Leverage existing PixiJS Graphics and Sprite APIs for enhanced rendering
- Use PixiJS filters (BlurFilter, GlowFilter) for LED effects
- Implement texture generation for breadboard substrate
- Add z-index management for wire layering
- Apply subtle shadows and lighting effects where appropriate
- Maintain rendering performance (target 60fps)

### Constraints

- Must maintain all existing functional capabilities (voltage overlays, current animation, component interaction)
- Cannot break existing tests (378 passing tests must continue to pass)
- Visual regression test baselines will need updating to reflect improved appearance
- Performance must remain acceptable (no significant FPS degradation)

## Dependencies

- PixiJS renderer infrastructure (already in place from PR #167)
- PixiJS filters and advanced rendering APIs (already available in pixi.js dependency)

## Educational Value

Photorealistic breadboard rendering directly supports the project's educational mission by:

- Helping students recognize and work with physical breadboards after using the simulator
- Building confidence through realistic visual feedback
- Reducing the gap between simulation and real-world prototyping
- Professional appearance increases credibility and adoption in educational settings

## Alignment with Goal

This task directly addresses acceptance criteria from goal.md:

- "Breadboard rendering is 2D (top-down) and photorealistic" ✓
- "Breadboard geometry reflects real physical structure" ✓
- "Overlapping wires are visually unambiguous" ✓
- "Active LEDs emit a subtle glow derived from solver output" ✓

## Priority Rationale

This is the most important development gap because:

1. Visual quality is a foundational aspect that affects all user interactions
2. The gap is explicitly called out in goal.md as a required capability
3. PixiJS infrastructure is already in place (PR #167), making implementation feasible
4. Photorealistic rendering enhances educational value by bridging simulation and reality
5. Professional appearance increases adoption potential in educational institutions
6. The goal document marks several of these requirements with explicit acceptance criteria

## Estimated Complexity

**Medium-High**: Requires artistic/design work alongside technical implementation. PixiJS APIs and infrastructure are already available, but achieving photorealistic quality requires careful attention to visual detail, texture generation, and lighting effects. The technical implementation is straightforward, but the design iteration to achieve "photorealistic" quality may require multiple rounds of refinement.
