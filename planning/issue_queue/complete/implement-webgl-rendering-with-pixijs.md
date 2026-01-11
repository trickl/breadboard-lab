Migrate rendering from SVG to WebGL-based pipeline using PixiJS

## Context

The system currently uses SVG-based rendering for all breadboard and schematic visualizations. The goal document explicitly requires "WebGL-grade rendering" with photorealistic visual fidelity, including features like wire depth cues, LED glow effects, and shading/lighting for overlapping wires.

## Gap Analysis

**Goal requirements (from planning/vision/goal.md, lines 84-103):**

- Rendering uses a WebGL-capable pipeline (PixiJS recommended)
- Breadboard rendering is 2D (top-down) and photorealistic
- Overlapping wires have shading/lighting to indicate overlap ordering
- Depth cues (z-order, shadowing, thickness) ensure crossings don't look like junctions
- Active LEDs emit a subtle glow derived from solver output
- LED glow varies continuously with simulated current/power

**Current state (from planning/state/system_capabilities.md):**

- All rendering uses SVG via `document.createElementNS`
- Component renderer creates SVG elements for breadboard components
- Schematic renderer creates SVG elements for schematic diagrams
- No WebGL pipeline in place
- No LED glow effects
- No wire depth/shading effects for crossings

## Impact

This is a **foundational architectural gap** that affects:

1. Visual quality and photorealism
2. Ability to implement LED glow effects
3. Wire overlap disambiguation
4. Overall educational effectiveness (visual feedback is critical for learning)
5. Future features that depend on advanced rendering (lighting, shadows, effects)

## Proposed Development Task

**Objective:** Migrate the breadboard rendering pipeline from SVG to PixiJS (WebGL-capable renderer) while maintaining all existing functional capabilities.

**Scope:**

1. Install and configure PixiJS as a dependency
2. Replace SVG-based breadboard grid rendering with PixiJS graphics
3. Replace SVG-based component rendering with PixiJS sprites/graphics
4. Migrate voltage overlay rendering to PixiJS
5. Migrate current animation to PixiJS particle system
6. Migrate error overlay icons to PixiJS
7. Implement LED glow effect based on simulated current (new visual feature enabled by WebGL)
8. Implement wire depth/shading for crossings (new visual feature enabled by WebGL)
9. Update all existing tests to work with PixiJS rendering
10. Update visual regression tests with new baseline screenshots

**Non-goals for this task:**

- Schematic view can remain SVG-based initially (separate follow-up task)
- Do not change any circuit simulation logic
- Do not change any interaction logic (placement, selection, drag, rotation)
- Do not add new components or features beyond rendering improvements

**Technical approach:**

- Use PixiJS Graphics API for procedural shapes (holes, wires, resistors, ground symbols)
- Use PixiJS Sprites for components where bitmap assets improve quality
- Use PixiJS filters for LED glow effect (BlurFilter or GlowFilter)
- Use z-index and rendering order for wire crossing depth cues
- Maintain existing coordinate system and layout calculations
- Keep core logic layer unchanged (only UI layer affected)

**Acceptance criteria:**

1. Breadboard grid renders using PixiJS WebGL canvas
2. All component types render correctly in PixiJS
3. Voltage overlays display with correct colors
4. Current animation particles render smoothly
5. Error overlay icons are clickable and visible
6. LED glow effect is visible when LED has current flow
7. Wire crossings have visual depth cues (shading or z-order)
8. All existing interaction behaviors work (click, drag, rotate, select, delete)
9. All 224 unit tests pass
10. All 7 visual regression tests pass with updated baselines
11. Performance is equal or better than SVG rendering

**Estimated complexity:** Large (4-6 days)

- Significant architectural change affecting entire rendering layer
- Requires learning PixiJS API and WebGL rendering concepts
- Needs careful migration to maintain existing functionality
- Extensive testing required (unit, integration, visual regression)

**Risks:**

- Performance regression if not implemented carefully
- Compatibility issues with browsers/devices
- Breaking existing tests and visual regression baselines
- Interaction event handling may need adjustments for PixiJS event model

**Dependencies:**

- None (can be implemented immediately)

**Why this is the most important next step:**

1. It's explicitly marked as "required" in the goal document
2. It's foundational to other visual features (LED glow, wire depth cues)
3. It unblocks future rendering enhancements
4. SVG cannot achieve the visual fidelity goals
5. It's a significant architectural investment that should be done early before more SVG-dependent features are added
