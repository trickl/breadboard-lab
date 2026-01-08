Fix Quick Select Panel: Functionality and Visual Design

## Source Review
This task addresses critique items from `planning/reviews/review-2026-01-08.md`.

## Review Items Addressed

This task addresses the following related critique items from the review:

### Section 2: Quick Select Panel (Lines 32-55)
**Functional Gaps (Section 2.3):**
- There is **no way to remove items** from Quick Select
- Clicking a Quick Select item currently **does nothing**
- Expected behaviour: Clicking an item spawns a new component off the breadboard, ready to be placed

**Visual Design Issues (Section 2.1):**
- Icons do **not use the full width** of the sidebar
- Icons are **too square** and visually cramped
- Labels are **hard to read**
- Unclear text such as `322S5` appears, with no obvious meaning to users
- The panel feels visually secondary despite being a primary interaction surface

**Expected Design & Behaviour (Section 2.2):**
- Quick Select should use **clear, recognisable component icons** (e.g. resistor, LED, diode)
- The **Component Library already contains category icons** (diodes, LEDs, power supplies, etc.) - these should be reused for visual consistency
- Quick Select items should:
  - Use more horizontal width
  - Use more intelligent vertical spacing
- The panel should feel like a **fast-access component palette**, not a compressed list

### Section 11: Critical Functional Blocker (Line 203)
Listed as a blocking issue:
- "Clicking Quick Select does nothing"

### Section 12: Priority Summary (Lines 218-219)
Listed under "Blocking Issues":
- "Quick Select click produces no component"

## Task Context

The Quick Select panel is intended to be a **fast-access component palette** for frequently-used components. It is a critical part of the user interaction workflow. However, it currently has two major categories of problems:

1. **Functional**: The panel is non-functional - clicking items does nothing and there's no way to manage items in the list
2. **Visual**: The panel looks cramped, unprofessional, and uses unclear labels

Both issues must be addressed together because:
- They affect the same UI component
- Fixing functionality without improving visuals leaves a poor user experience
- The visual redesign requires understanding the functional behavior (spawning components)
- They are both listed as blocking/high priority in the review

## Detailed Implementation Instructions

### Part 1: Implement Quick Select Click Functionality

#### 1.1 Understand Current Quick Select Data Structure
- Locate where Quick Select items are defined and stored in the application state
- Identify the data structure (likely an array of component type identifiers or component metadata)
- Understand how items are currently added to Quick Select (probably from Component Library)

#### 1.2 Implement Click Handler
When a user clicks a Quick Select item:
1. **Spawn a new component** of the selected type
2. Position it **off the breadboard** (e.g., above or to the side, in a visible "staging area")
3. The component should be **ready to be placed** - either:
   - Automatically enter drag mode so the user can immediately place it, OR
   - Select the component so the user can drag it onto the breadboard
4. Ensure the spawned component has a **unique ID** and does not conflict with existing components

**Expected user flow:**
- User clicks "Resistor" in Quick Select
- A new resistor appears off the breadboard, selected
- User drags it onto the breadboard
- Component snaps to valid breadboard positions (existing drag-and-drop behavior)

**Code location hints:**
- Quick Select panel is likely in `src/ui/` directory
- Look for component spawning logic in the Component Library (reuse or reference it)
- Component placement/drag logic should already exist from the drag-and-drop restoration work

#### 1.3 Handle Edge Cases
- If Quick Select is empty, show appropriate empty state (e.g., "Add items from Component Library")
- If a component is spawned but not placed, determine whether it should persist or be discarded
- Ensure spawned components don't interfere with existing components or wires

### Part 2: Implement Quick Select Item Removal

#### 2.1 Add Removal UI
Add a way for users to remove items from Quick Select. Two design options:

**Option A (Recommended): Hover Actions**
- When hovering over a Quick Select item, show a small "×" button or trash icon
- Clicking the remove button removes the item from Quick Select (does not delete components from the breadboard)
- Provides clear, discoverable interaction

**Option B: Context Menu**
- Right-click on a Quick Select item to show context menu with "Remove from Quick Select" option
- More hidden but doesn't clutter the UI

Choose the option that best fits the existing UI patterns in the application.

#### 2.2 Implement Removal Logic
- Locate the Quick Select state management
- Implement a method to remove an item by index or identifier
- Ensure removal updates the UI immediately
- Persist the Quick Select list (if the app has persistence for user preferences)

#### 2.3 Handle Empty State
- When the last item is removed, show appropriate empty state message
- Provide clear guidance on how to add items back (e.g., "Add components from the Component Library below")

### Part 3: Redesign Quick Select Visual Appearance

#### 3.1 Reuse Component Library Icons
**Critical requirement:** The Component Library already contains category icons (diodes, LEDs, power supplies, etc.) that are clear and recognizable. Quick Select must reuse these icons for visual consistency.

- Locate the Component Library icon rendering code
- Extract or reference the icon rendering logic
- Ensure Quick Select items use the **same visual representation** as their Component Library counterparts
- This provides immediate visual recognition and consistency

#### 3.2 Improve Layout and Spacing
Current problems:
- Icons don't use full width of sidebar
- Icons are too square and cramped
- Labels are hard to read
- Panel feels compressed

**Required changes:**
- **Increase horizontal width usage:** Quick Select items should span most of the sidebar width (leave small margins)
- **Improve aspect ratio:** Items should be rectangular rather than square (e.g., 3:1 or 4:1 width:height ratio)
- **Increase vertical spacing:** Add padding/margin between items so they don't feel cramped
- **Improve label typography:**
  - Use clear, readable font size
  - Ensure adequate contrast
  - Remove unclear technical identifiers like `322S5` unless they have clear meaning
  - Use friendly component names (e.g., "Resistor", "Red LED", "Diode") instead of part numbers

#### 3.3 Icon + Label Layout
Each Quick Select item should have:
- **Icon on the left** (using Component Library icon style)
- **Label on the right** (component name, not part number)
- **Adequate whitespace** around both
- **Visual affordance** that it's clickable (e.g., hover state, cursor change)

Example layout:
```
┌─────────────────────────────────────┐
│  [Resistor Icon]   Resistor      [×]│
├─────────────────────────────────────┤
│  [LED Icon]        Red LED       [×]│
├─────────────────────────────────────┤
│  [Diode Icon]      Diode         [×]│
└─────────────────────────────────────┘
```

#### 3.4 Make it Feel Like a Primary Interaction Surface
The Quick Select panel should feel like a **fast-access component palette**, not a compressed list. To achieve this:
- Use adequate sizing (items should be easily clickable)
- Use clear visual hierarchy (icons and labels should be prominent)
- Add hover states that make interactivity obvious
- Consider subtle visual enhancements (borders, shadows, hover highlights) that distinguish it from passive lists
- Ensure it visually stands out from informational panels on the right sidebar

### Part 4: Testing Requirements

#### 4.1 Functional Testing
- Verify clicking a Quick Select item spawns a component
- Verify spawned component can be dragged onto the breadboard
- Verify spawned component has correct type and properties
- Verify removing an item from Quick Select works correctly
- Verify Quick Select persists across page reloads (if applicable)
- Test with empty Quick Select list
- Test with many items in Quick Select list

#### 4.2 Visual Testing
- Verify icons match Component Library icons exactly
- Verify labels are readable and use friendly names
- Verify layout uses adequate width and spacing
- Verify hover states work correctly
- Take screenshots before and after for comparison
- Ensure Quick Select visually stands out as a primary interaction surface

#### 4.3 Integration Testing
- Verify Quick Select works with existing Component Library
- Verify spawned components integrate with drag-and-drop system
- Verify spawned components integrate with circuit simulation
- Test interaction with other sidebar panels

### Part 5: Implementation Sequence

**Phase 1: Implement Click Functionality (2-3 hours)**
1. Locate Quick Select data structure and click handlers
2. Implement component spawning logic
3. Position spawned component off breadboard
4. Connect to existing drag-and-drop system
5. Test component spawning and placement flow

**Phase 2: Implement Item Removal (1-2 hours)**
1. Design and implement removal UI (hover button or context menu)
2. Implement removal logic
3. Update state management
4. Handle empty state
5. Test removal functionality

**Phase 3: Visual Redesign (2-3 hours)**
1. Identify and extract Component Library icon rendering
2. Update Quick Select layout to use full width
3. Improve spacing and aspect ratios
4. Update labels to use friendly names
5. Add hover states and visual affordances
6. Ensure visual hierarchy makes it feel like a primary palette

**Phase 4: Testing and Refinement (1-2 hours)**
1. Comprehensive functional testing
2. Visual comparison and refinement
3. Integration testing with Component Library and drag-and-drop
4. User experience validation
5. Take before/after screenshots

**Total Estimated Effort:** 6-10 hours

### Part 6: Success Criteria

Implementation is complete when:

1. ✅ Clicking a Quick Select item spawns a new component
2. ✅ Spawned component appears off the breadboard, ready to be placed
3. ✅ Spawned component can be dragged onto the breadboard using existing drag-and-drop
4. ✅ Users can remove items from Quick Select (via hover button, context menu, or similar)
5. ✅ Quick Select shows appropriate empty state when no items present
6. ✅ Quick Select icons match Component Library icons exactly (visual consistency)
7. ✅ Quick Select items use adequate horizontal width (not cramped)
8. ✅ Quick Select items have proper vertical spacing (not compressed)
9. ✅ Quick Select labels use friendly component names (not technical identifiers)
10. ✅ Quick Select labels are clearly readable (good typography and contrast)
11. ✅ Quick Select has clear hover states indicating interactivity
12. ✅ Quick Select visually stands out as a primary interaction surface
13. ✅ All functional tests pass
14. ✅ Visual tests confirm improved design
15. ✅ Integration with Component Library and drag-and-drop works correctly

### Part 7: Constraints and Guidelines

**Refactor Safety (per problem statement):**
- If moving code, move it verbatim first, then fix imports and adapt
- Do not rewrite functions from scratch
- Do not maintain legacy endpoints for backwards compatibility
- Delete unused code
- Do not leave comments on changes made within the code

**Code Changes:**
- Only change logic if it's a clear bug (non-functional Quick Select clicks are a bug)
- Ensure all tests and linting pass
- Make minimal necessary changes
- Prioritize reusing existing code (Component Library icons, drag-and-drop system)

**Design:**
- Follow existing UI patterns in the application
- Reuse Component Library visual style for consistency
- Ensure accessibility (keyboard navigation, screen readers)

### Part 8: Related Review Items NOT in This Task

This task does NOT address:
- Sidebar rebalancing (moving panels between left and right) - separate task
- Component rotation - separate task
- Breadboard orientation rotation - separate task
- Component Properties panel improvements - separate task
- Breadboard hole selection reliability - separate task (may be a separate bug)

These are intentionally excluded to keep the task focused and deliverable in a single PR.

### Part 9: Reference Materials

**Review Document:**
- `planning/reviews/review-2026-01-08.md` - Section 2 (lines 32-55), Section 11 (line 203), Section 12 (lines 218-219)

**Relevant Code Areas (to investigate):**
- Quick Select panel UI component (likely in `src/ui/`)
- Component Library implementation (for icon rendering)
- Component spawning/instantiation logic
- Drag-and-drop system (recently restored, should be working)
- Application state management for Quick Select items

**Related Completed Tasks:**
- `restore-drag-and-drop-component-repositioning.md` - Drag-and-drop should be working, Quick Select should integrate with it

## Why This Task Is High Priority

1. **Listed as "Blocking Issue"** in the review's Priority Summary (Section 12)
2. **Part of "Critical Functional Blocker"** (Section 11): "core interaction does not currently work"
3. **High frequency operation**: Quick Select is intended for fast access to frequently-used components
4. **User-facing and immediately visible**: Users will try to click Quick Select items and be frustrated when nothing happens
5. **Cohesive scope**: Functional and visual issues are tightly coupled and must be fixed together
6. **Foundational for workflow**: Quick Select is a primary interaction point for component placement
7. **Clear acceptance criteria**: Review provides specific, testable requirements

This task should be completed before addressing the sidebar rebalancing or rotation features, as it fixes a core broken interaction.
