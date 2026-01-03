Integrate Component Library UI with Browser Modal
===================================================

## Context

The component library infrastructure was implemented in PR #143, providing a complete foundation with 35 real-world, physically accurate components (resistors, LEDs, power supplies, wires, ground, and a speaker). However, the UI still displays only 5 abstract component type buttons (Wire, Resistor, LED, Power Supply, Ground), preventing users from selecting specific parts by their real-world specifications.

This creates a significant gap between the educational vision—teaching students which specific parts to purchase—and the current user experience, which treats components as abstract types without manufacturer details, physical dimensions, or tolerance specifications.

## Current State

**Component library infrastructure (complete):**
- `ComponentLibraryEntry` data model with physical/electrical specifications
- Component registry with lookup, search, and filtering capabilities
- 35 cataloged components:
  - 23 resistors (E12 series, 5% and 1% tolerance variants)
  - 4 LEDs (3mm ultra-bright yellow, 5mm red/green/blue)
  - 1 speaker (8Ω module)
  - 4 power supplies (3.3V, 5V, 9V, 12V)
  - 2 wires (red, black)
  - 1 ground reference
- Backward compatibility utilities for gradual migration
- 50 tests covering all library functionality
- Complete documentation (COMPONENT_LIBRARY.md)

**UI state (incomplete):**
- Left toolbar shows 5 abstract buttons
- No component browser or search interface
- No access to manufacturer metadata or specifications
- Property editor doesn't show library details
- Component rendering uses generic visuals, not size-accurate representations

## Goal

Replace the abstract component type buttons with a modern component browser that enables:
1. Browsing the component library by category
2. Searching components by name, description, or part number
3. Viewing detailed specifications before placement
4. Selecting specific real-world parts with manufacturer metadata

## Proposed Implementation

### 1. Component Browser Modal

Create a searchable, categorized component browser modal that opens when users click a new "📦 Component Library" button in the toolbar.

**Modal structure:**
- Header with search input (filters by name/description/part number)
- Category tabs or accordion (Passive, Diode, Power, Interconnect, etc.)
- Component grid displaying:
  - Component name
  - Package type and key specs
  - Manufacturer/part family (if available)
  - Visual icon or procedural preview
- Click component to select and close modal
- User then places selected component using existing two-click interaction

**Search and filter:**
- Real-time text search using `componentLibrary.search(query)`
- Category filtering using `componentLibrary.getByCategory(category)`
- Combined search + category filter
- Clear search button to reset

**Component cards:**
- Name and description
- Physical specs (package, dimensions, pin count)
- Electrical specs (resistance, voltage, current ratings, tolerance)
- Manufacturer metadata when available
- "Select" button or click-to-select interaction

### 2. Toolbar Updates

**Replace existing buttons:**
- Remove 5 individual component type buttons
- Add single "📦 Component Library" button that opens browser modal
- Keep existing buttons: Examples, Load, Save, Clear All

**Rationale:**
- Cleaner interface (1 button instead of 5)
- Scalable to any number of components
- Consistent with modern component selection patterns

### 3. Property Editor Enhancement (Optional)

When a component with `libraryId` is selected, show library metadata in property editor:
- Component name from library
- Manufacturer and part number (if available)
- Physical package information
- Link to datasheet (future enhancement)

This is optional for the initial implementation but would enhance the educational value.

### 4. Migration Strategy

**Backward compatibility:**
- Existing circuits without `libraryId` continue to work
- When loading old circuits, use `getDefaultLibraryId()` to suggest library match
- Property editor still allows editing raw values
- All existing tests remain passing

**Gradual migration path:**
1. New components placed from browser get `libraryId` automatically
2. Existing components without `libraryId` render as before
3. Future enhancement: "Migrate to Library Part" button in property editor

## Technical Details

**Files to modify:**
- `src/ui/breadboard-app.ts`: Add component browser modal, remove old buttons
- `src/style.css`: Add modal styling for component browser
- `src/ui/component-renderer.ts`: (Optional) Size-accurate rendering based on library package dimensions

**Files to create:**
- `src/ui/component-browser.ts`: New component browser UI class (optional, can be inline in breadboard-app)

**Integration points (from COMPONENT_LIBRARY.md):**
- Component browser modal uses `componentLibrary.getAll()` for initial display
- Search uses `componentLibrary.search(query)`
- Category filtering uses `componentLibrary.getByCategory(category)`
- Selected component gets `libraryId` field populated
- Existing placement logic unchanged (still two-click interaction)

## Success Criteria

- [ ] "Component Library" button opens searchable browser modal
- [ ] Modal displays all 35 library components organized by category
- [ ] Search filters components by name/description/part number
- [ ] Category filtering works correctly
- [ ] Selecting a component closes modal and enables placement
- [ ] Placed components have `libraryId` field populated
- [ ] Property editor shows library metadata for components with `libraryId`
- [ ] All existing circuits load without errors
- [ ] All 217 existing tests pass
- [ ] Visual regression tests pass (no unintended visual changes)

## Educational Impact

This change transforms the user experience from:
- **Before**: "Click 'Resistor' button, place a generic resistor, set resistance to 1000Ω"
- **After**: "Click 'Component Library', search or browse for '1kΩ 1/4W 5% Resistor (Brown-Black-Red-Gold)', see it's a Yageo CFR series axial package, select it, place it"

Students learn:
- What real components look like (package types, physical dimensions)
- How to read specifications (tolerance, power rating, voltage rating)
- Which parts to purchase for projects
- Manufacturer part numbers and families
- Why specific components are chosen (e.g., 1% vs 5% tolerance)

## Constraints

- Do not remove backward compatibility with existing circuits
- Do not change placement interaction (keep two-click pattern)
- Do not modify component library infrastructure (already complete)
- Modal should be keyboard-accessible (tab navigation, escape to close)
- Search should be case-insensitive
- Performance: component list rendering should be efficient even with 100+ components

## Non-Goals (Future Work)

- Custom component creation or user-extensible library
- Datasheet links or external resources
- Component comparison or side-by-side views
- Advanced filtering (by voltage range, power rating, etc.)
- Drag-and-drop from component browser to breadboard
- Size-accurate rendering based on package dimensions (can be separate task)
- Tolerance-based resistor color bands (already implemented, just needs library integration)

## References

- **COMPONENT_LIBRARY.md**: Complete architecture guide, usage examples, integration strategy
- **IMPLEMENTATION_SUMMARY.md**: Design decisions and rationale
- **system_capabilities.md** (lines 32-99): Current component library status and integration points
- **goal.md** (lines 174-194): Component Library (Real-World Parts) requirements

## Estimated Complexity

**Medium** - Requires UI development but leverages existing infrastructure:
- Component browser modal: ~200-300 lines
- Toolbar updates: ~50 lines
- CSS styling: ~100 lines
- Property editor enhancement: ~50 lines (optional)
- Testing: Update existing UI tests, add browser interaction tests

Total: ~400-500 lines of new/modified code

The infrastructure is complete; this is primarily UI/UX work to surface existing capabilities.
