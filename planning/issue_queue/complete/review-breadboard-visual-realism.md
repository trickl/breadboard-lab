Improve breadboard visual realism: rail colors and hole sizing

## Review Source

`planning/reviews/review-2026-01-08.md` — Section 9 (Breadboard Visual Realism, lines 171-191)

## Review Items Addressed by This Task

This task addresses **Section 9: Breadboard Visual Realism** in its entirety, which contains three related critique items focused on improving the visual authenticity of the breadboard rendering.

### Section 9.1: Colouring (lines 173-182)

**Critique:**

- Red and blue rails do **not look realistic**
- Most real breadboards are white or neutral
- Power rails are not inherently positive or negative—polarity depends on how the user connects power
- Recommendation: Remove red/blue colouring, use subtle realistic tones, let polarity be inferred from connections (not color)

**Current State:**
The breadboard currently uses red and blue coloring for power rails, which:

1. Is visually unrealistic (real breadboards typically have neutral-colored rails)
2. Suggests incorrect semantics (rails aren't inherently positive/negative)
3. Conflicts with the educational goal of showing that polarity is user-determined

### Section 9.2: Hole Geometry (lines 184-186)

**Critique:**

- Breadboard holes are visually **too large**
- Real breadboard holes are much smaller

**Current State:**
Holes are rendered larger than they appear on real breadboards, reducing visual realism.

### Section 9.3: Desired Compromise (lines 188-191)

**Critique:**

- **Visual hole**: small and realistic
- **Selection hit area**: large and forgiving
- This preserves usability without sacrificing realism

**Design Principle:**
The review explicitly states the solution: decouple visual appearance from interactive hit areas. Make holes look small and realistic while maintaining large, forgiving hit detection for usability.

**Note:** PR #297 already implemented large hit areas (12px radius vs 10px visual) for breadboard holes. This task extends that pattern by making the visual holes smaller while keeping or further enlarging the hit areas.

## Priority

**Medium Priority** (per Section 12: Priority Summary, lines 228-231)

This falls under "Medium Priority Improvements" alongside:

- Breadboard visual realism
- Hole sizing vs hit area
- Dark/light theme toggle (separate task)

This is not a blocking issue but is an important visual polish improvement that enhances the educational and realistic feel of the application.

## Context & Related Work

### Existing Hit Area Implementation (PR #297)

PR #297 already implemented enlarged hit areas for holes:

- Visual hole radius: 10px
- Hit area radius: 12px (20% larger)
- Located in `src/ui/pixi-renderer.ts`, `renderHole()` method

This task builds on that foundation by:

1. Further reducing visual hole size for realism
2. Maintaining or enlarging hit areas for usability
3. Updating rail colors to neutral tones

### Existing Rail Rendering

Power rails are rendered in `src/ui/pixi-renderer.ts` in the breadboard background rendering. Current implementation uses red (positive rail) and blue (negative/ground rail) colors.

## Technical Approach

### 1. Update Rail Colors (Section 9.1)

**File:** `src/ui/pixi-renderer.ts`

**Current Rendering:**

- Red rails for positive power
- Blue rails for ground

**Required Changes:**

- Change rail colors to neutral, realistic tones (e.g., silver/grey metallic appearance)
- Remove semantic color coding (red=positive, blue=negative)
- Use subtle shading or texture to maintain visual distinction between rail strips without suggesting polarity

**Implementation Details:**

- Locate rail rendering in breadboard background generation
- Replace red/blue color constants with neutral metallic tones (e.g., `0xC0C0C0` silver, `0xD3D3D3` light grey)
- Consider slight variation between top and bottom rails for visual distinction (not semantic)
- Ensure rails remain visually distinct from terminal strip areas
- Rails should appear as bare metal strips (realistic) rather than color-coded indicators

**Color Recommendations:**

- Top rails: Silver metallic (`0xC0C0C0` or similar)
- Bottom rails: Silver metallic (same or slightly lighter `0xD0D0D0`)
- Do NOT use red, blue, or any color suggesting electrical polarity
- Subtle metallic sheen or gradient is acceptable for realism
- Rails should look like actual breadboard bus strips (bare metal, neutral)

### 2. Reduce Visual Hole Size (Section 9.2)

**File:** `src/ui/pixi-renderer.ts`, `renderHole()` method

**Current State:**

- Visual hole radius: 10px (from PR #297 context)
- Hit area radius: 12px (from PR #297)

**Required Changes:**

- Reduce visual hole size to approximately 6-8px radius (40-60% size reduction)
- This makes holes appear more realistic (actual breadboard holes are quite small relative to hole spacing)
- Maintain or increase hit area size for usability

**Implementation Details:**

- Locate `renderHole()` method in `src/ui/pixi-renderer.ts`
- Reduce the radius parameter used for rendering the visual hole circle
- Test values: try 7px, 6px, or 8px radius
- Visual hole should appear noticeably smaller than current implementation
- Compare against reference images of real breadboards to validate size

### 3. Maintain/Expand Hit Areas (Section 9.3)

**File:** `src/ui/pixi-renderer.ts`, `renderHole()` method

**Current State:**

- Hit area radius: 12px (from PR #297)
- Already 20% larger than visual (10px)

**Required Changes:**

- Maintain current 12px hit area radius OR increase further to 14px if needed for usability
- Ensure hit area is significantly larger than visual hole (at least 100% larger in diameter)
- Do NOT reduce hit area—usability must not regress

**Implementation Details:**

- Hit area is set via `hitArea` property on hole graphics
- Keep existing hit detection logic from PR #297
- Test that holes remain easy to click despite smaller visual size
- If testing reveals difficulty clicking small holes, increase hit area to 14px or 15px
- Use circular `hitArea.contains()` for precise detection (already implemented in PR #297)

**Design Validation:**
After implementing visual size reduction:

1. Test hole selection with small visual holes
2. Verify that selection feels natural and forgiving
3. If selection is difficult, increase hit area radius (do NOT increase visual size)
4. Goal: holes look realistic (small) but feel easy to click (large hit area)

### 4. Visual Testing & Validation

**Manual Testing Checklist:**

**Rail Color Validation:**

- [ ] Load application and view breadboard
- [ ] Verify power rails appear silver/grey/neutral (not red/blue)
- [ ] Verify rails do not suggest electrical polarity through color
- [ ] Compare against reference image of real breadboard
- [ ] Verify rails remain visually distinct from terminal strip areas

**Hole Size Validation:**

- [ ] View breadboard at 100% zoom
- [ ] Verify holes appear small and realistic (compare to real breadboard reference)
- [ ] Verify holes are noticeably smaller than before (compare screenshots)
- [ ] Click on holes throughout the breadboard (center, edges, rails, terminal strips)
- [ ] Verify all holes remain easy to click despite smaller visual size
- [ ] Test rapid clicking on adjacent holes to ensure hit areas don't overlap confusingly
- [ ] Test hovering near holes to verify hover feedback is responsive

**Integration Validation:**

- [ ] Load example circuits with components
- [ ] Verify component pin alignment looks correct with smaller holes
- [ ] Verify wire connection visuals look correct with smaller holes
- [ ] Place new components and verify snapping works correctly
- [ ] Route new wires and verify endpoint selection works correctly
- [ ] Test at all breadboard orientations (0°, 90°, 180°, 270°)

**Before/After Screenshot:**

- [ ] Take screenshot before changes (current state)
- [ ] Take screenshot after changes (improved realism)
- [ ] Include screenshots in PR description for visual comparison

## Constants & Values

### Recommended Visual Constants

**Hole Rendering:**

```typescript
// Visual appearance (smaller for realism)
const HOLE_VISUAL_RADIUS = 7; // px (reduced from ~10px)

// Interactive hit area (large for usability)
const HOLE_HIT_RADIUS = 12; // px (maintained from PR #297, or increase to 14-15px if needed)
```

**Rail Colors:**

```typescript
// Neutral metallic colors (realistic breadboard appearance)
const RAIL_COLOR_TOP = 0xc0c0c0; // Silver
const RAIL_COLOR_BOTTOM = 0xd0d0d0; // Light silver/grey

// Alternative: use same color for both if no visual distinction needed
const RAIL_COLOR = 0xc0c0c0; // Silver metallic
```

### Design Rationale

**Why Neutral Rail Colors:**

- Real breadboards have silver/grey metal bus strips
- Color does NOT indicate polarity (user connects power/ground to whichever rails they choose)
- Red/blue coloring teaches incorrect mental model (rails aren't inherently positive/negative)
- Neutral colors are more realistic and semantically correct

**Why Small Visual Holes:**

- Real breadboard holes are quite small (typically 0.8-1.0mm diameter on standard 2.54mm pitch boards)
- Current visual size is disproportionately large
- Smaller holes improve photorealistic appearance and educational realism

**Why Large Hit Areas:**

- Usability must not regress
- Clicking small targets is difficult and frustrating
- Invisible hit area can be much larger than visible hole
- This is standard UI practice (e.g., mobile touch targets are larger than visible buttons)
- PR #297 already established this pattern (12px hit vs 10px visual)

## Files to Modify

1. **`src/ui/pixi-renderer.ts`**
   - `renderHole()` method: Reduce visual hole radius, maintain/expand hit area
   - Breadboard background rendering: Change rail colors from red/blue to neutral silver/grey
   - Possibly extract color constants for maintainability

2. **No changes expected to:**
   - Data models (this is purely visual)
   - Electrical simulation (rail colors don't affect simulation)
   - Component placement logic (hole positions unchanged)
   - Hit detection logic (already implemented in PR #297, just adjust radius values)

## Success Criteria

This task is complete when:

1. ✅ Power rails render in neutral silver/grey tones (not red/blue)
2. ✅ Rails do not visually suggest electrical polarity
3. ✅ Breadboard holes render with small, realistic visual size (~6-8px radius)
4. ✅ Holes remain easy to click (hit area ≥12px radius, larger if needed)
5. ✅ Hit area is at least 100% larger in diameter than visual hole
6. ✅ All hole selection interactions remain functional (place components, route wires)
7. ✅ Visual realism is noticeably improved (validated via before/after screenshots)
8. ✅ No usability regressions (hole selection remains easy and forgiving)
9. ✅ No functional regressions (all tests pass, application works correctly)
10. ✅ Changes are minimal and surgical (only modify rendering, not logic)

## Known Constraints & Limitations

### Do Not Modify Data Model

- This is purely a visual/rendering change
- Do NOT change breadboard topology data structures
- Do NOT change component pin spacing or position calculations
- Hole positions in grid coordinates remain unchanged
- Only visual appearance and hit area sizes change

### Maintain Backward Compatibility

- Circuit save/load files are unaffected (they store logical positions, not visual appearance)
- Component placement logic unchanged
- Electrical netlist generation unchanged
- Simulation behavior unchanged

### Preserve PR #297 Improvements

- Do NOT break hole hit detection implemented in PR #297
- Do NOT remove explicit `hitArea` from holes
- Do NOT reduce hit area size below current 12px (can increase if needed)
- Build on existing implementation, don't rewrite

### Coordinate with Breadboard Rotation (PR #303, #309)

- Visual changes should work at all breadboard orientations (0°, 90°, 180°, 270°)
- Test that smaller holes and neutral rails look correct when breadboard is rotated
- No new coordinate transformation needed (this is visual rendering only)

## Testing Requirements

### Unit Testing

- No new unit tests required (this is visual/rendering change only)
- Verify existing tests continue to pass (no regression)

### Visual Regression Testing

- If visual regression tests exist, update baseline screenshots
- Document visual changes in PR description with screenshots

### Manual Testing

- Follow "Visual Testing & Validation" checklist above
- Test thoroughly at multiple zoom levels if zoom is implemented
- Test at all breadboard orientations
- Test with example circuits loaded
- Test component placement and wire routing workflows

## References

**Review Document:**

- `planning/reviews/review-2026-01-08.md`
- Section 9: Breadboard Visual Realism (lines 171-191)

**Related PRs:**

- PR #297: Implemented enlarged hit areas for holes (12px hit vs 10px visual)
- PR #303, #309: Breadboard rotation (verify visual changes work at all orientations)

**Real Breadboard References:**
When implementing, consult images of real breadboards to validate:

- Hole size relative to hole spacing (typically very small)
- Rail color (typically silver/grey metal strips, not red/blue plastic)
- Overall proportions and visual appearance

## Implementation Notes

### Recommended Implementation Order

1. **Phase 1: Rail Color Update**
   - Locate rail rendering code in `src/ui/pixi-renderer.ts`
   - Change red/blue colors to neutral silver/grey
   - Test visually—verify rails look realistic and neutral
   - Commit: "Update breadboard rail colors to neutral silver/grey for realism"

2. **Phase 2: Hole Size Reduction**
   - Locate `renderHole()` method in `src/ui/pixi-renderer.ts`
   - Reduce visual hole radius (test 7px, 6px, or 8px)
   - Do NOT touch hit area in this commit
   - Test visually—verify holes look realistic
   - Commit: "Reduce visual hole size for improved realism"

3. **Phase 3: Hit Area Validation**
   - Test hole selection thoroughly
   - If selection is difficult, increase hit area radius (e.g., 14px or 15px)
   - Ensure usability is not regressed
   - Commit: "Adjust hole hit area for optimal usability" (only if needed)

4. **Phase 4: Validation & Screenshots**
   - Test complete workflow (placement, wiring, rotation)
   - Capture before/after screenshots
   - Document visual improvements in PR description
   - Verify all success criteria met

### Code Patterns to Follow

**When modifying hole rendering:**

```typescript
// GOOD: Separate visual size from hit area
const visualHoleRadius = 7; // Small and realistic
const hitAreaRadius = 12; // Large and forgiving

// Render visual hole at small size
graphics.circle(x, y, visualHoleRadius);

// Set hit area at larger size
graphics.hitArea = new Circle(0, 0, hitAreaRadius);
```

**When modifying rail colors:**

```typescript
// GOOD: Use neutral, realistic colors
const RAIL_COLOR = 0xc0c0c0; // Silver metallic

// BAD: Do NOT use semantic colors
const RAIL_POSITIVE_COLOR = 0xff0000; // Red (implies polarity)
const RAIL_NEGATIVE_COLOR = 0x0000ff; // Blue (implies polarity)
```

### Potential Pitfalls

**Pitfall 1: Making holes too small**

- If visual holes become TOO small (e.g., 3-4px), they may be hard to see
- Test at typical viewing distances
- 6-8px radius is recommended range (not smaller)

**Pitfall 2: Reducing hit area**

- Do NOT reduce hit area below 12px
- Usability must not regress
- If anything, increase hit area to compensate for smaller visual size

**Pitfall 3: Breaking component alignment**

- Component pins must still align with hole centers
- Only visual radius changes, not hole position or spacing
- Test component placement thoroughly after changes

**Pitfall 4: Color contrast issues**

- Ensure neutral rail colors have sufficient contrast against background
- Rails must remain visually distinct from terminal strip areas
- Test in both normal and X-ray modes

## Additional Considerations

### X-Ray Mode Compatibility

- Verify that neutral rail colors work well with X-ray mode (PR #321)
- In X-ray mode, internal connectivity traces (gold) should remain clearly visible
- Neutral rails should not conflict with gold trace coloring
- Test that smaller holes don't interfere with X-ray mode trace visibility

### Future Enhancements (Out of Scope)

The review mentions other visual improvements not included in this task:

- Dark/light theme toggle (Section 10)—separate task
- Breadboard texture/shading improvements—not in review
- 3D depth effects for holes—not in review

These are explicitly out of scope for this PR. Focus only on Section 9 items.

## Tone & Approach

This task is **purely visual polish**. It should:

- Make minimal, surgical changes to rendering code
- Not touch any electrical simulation or interaction logic
- Improve realism without sacrificing usability
- Be validated through visual comparison and manual testing

The review feedback is clear and prescriptive. Follow the review's recommendations directly:

- Neutral rail colors (not red/blue)
- Small visual holes (not large)
- Large hit areas (preserve usability)

This is not a refactoring task or a feature addition. It's a focused visual improvement to bring the breadboard rendering closer to real-world appearance while maintaining excellent usability.
