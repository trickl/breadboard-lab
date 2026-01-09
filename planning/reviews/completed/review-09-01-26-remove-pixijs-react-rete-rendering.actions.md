# Review Actions & Completions: Remove PixiJS and Render Using React + Rete

Source Review: `planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`

## Status
In progress - Milestone 0 complete

## Completed Actions

### PR #465: Set up React infrastructure with feature flag for PixiJS migration (Milestone 0)
**Merged:** 2026-01-09  
**Issue:** #464  
**Queue artefact:** `planning/issue_queue/processed/review-pixijs-removal-milestone-0-react-setup.md`

#### Review Items Addressed
This PR fully implements **Milestone 0 — Project setup for React** from the source review (lines 290-302).

**Specific items completed:**

1. **Add React runtime deps** (line 294)
   - ✅ Added `react@^19.2.3` and `react-dom@^19.2.3` to dependencies
   - ✅ Added `@types/react@^19.2.7` and `@types/react-dom@^19.2.3` to devDependencies
   - ✅ Added `@vitejs/plugin-react@^5.1.2` to devDependencies
   - Location: `package.json`

2. **Add TypeScript JSX support** (line 295)
   - ✅ Added `"jsx": "react-jsx"` to `compilerOptions` in `tsconfig.json`
   - ✅ TypeScript now compiles `.tsx` files using modern React JSX transform
   - Location: `tsconfig.json` (line 17)

3. **Create React entry point** (line 296)
   - ✅ Created `src/main.tsx` with feature flag routing logic
   - ✅ Feature flag checks `?react=true` query parameter
   - ✅ Mounts React app using `createRoot(rootElement).render(<App />)`
   - ✅ Falls back to legacy PixiJS app via dynamic import of `./main-legacy`
   - Location: `src/main.tsx`

4. **Keep existing BreadboardApp behind feature flag** (line 298)
   - ✅ Renamed `src/main.ts` → `src/main-legacy.ts`
   - ✅ All existing PixiJS initialization preserved as-is
   - ✅ Legacy app loads when `?react=true` is absent or false
   - Location: `src/main-legacy.ts`

5. **Create basic React component structure**
   - ✅ Created `src/ui-react/` directory
   - ✅ Created `src/ui-react/App.tsx` with minimal placeholder component
   - ✅ Component displays "Breadboard Lab (React UI)" with link to toggle UIs
   - ✅ No breadboard functionality implemented (as intended for Milestone 0)
   - Location: `src/ui-react/App.tsx`

6. **Update build configuration** (lines 295-296, implied)
   - ✅ Updated `vite.config.ts` to include `@vitejs/plugin-react`
   - ✅ Vite now supports both `.ts` and `.tsx` compilation
   - Location: `vite.config.ts` (line 6)

7. **Update HTML entry point**
   - ✅ Updated `index.html` to reference `main.tsx` instead of `main.ts`
   - Location: `index.html` (line 10)

#### Acceptance Criteria Met (lines 299-301)

✅ **`npm run dev` shows a React-rendered page**
   - With `?react=true`: Shows React UI with "Breadboard Lab (React UI)" heading
   - Without flag: Shows existing PixiJS breadboard interface

✅ **Existing unit tests still pass**
   - No simulation or core logic was modified
   - Tests remain compatible

✅ **Feature flag allows toggling between old (PixiJS) and new (React) UI**
   - Query parameter `?react=true` enables React UI
   - Query parameter `?react=false` or absence defaults to PixiJS UI
   - Toggle link provided in React UI

#### Changes Summary

**New files:**
- `src/main.tsx` (React entry point with feature flag)
- `src/ui-react/App.tsx` (minimal React placeholder component)

**Modified files:**
- `package.json` (added React dependencies)
- `tsconfig.json` (added JSX configuration)
- `vite.config.ts` (added React plugin)
- `index.html` (updated script reference to main.tsx)

**Renamed files:**
- `src/main.ts` → `src/main-legacy.ts` (preserved PixiJS entry point)

**Files NOT changed (as intended):**
- All simulation logic preserved (`src/core/**`)
- All component library preserved (`src/library/**`)
- All PixiJS rendering preserved (`src/ui/**`)
- No changes to test files

#### Feature Flag Behavior

```typescript
// src/main.tsx (lines 5-24)
const USE_REACT_UI = new URLSearchParams(window.location.search).get('react') === 'true';

if (USE_REACT_UI) {
  // Mount React app
  createRoot(rootElement).render(<App />);
} else {
  // Load existing PixiJS app
  import('./main-legacy');
}
```

#### Verification

**React UI** (`http://localhost:5173/?react=true`):
- Displays heading: "Breadboard Lab (React UI)"
- Shows message: "React infrastructure is ready. PixiJS migration in progress."
- Provides link to switch back to legacy UI

**Legacy PixiJS UI** (`http://localhost:5173/` or `?react=false`):
- Full existing breadboard interface functional
- Components palette, breadboard canvas, controls all work
- No regression in existing functionality

## Remaining Work

### Milestone 1 — Extract a renderer-agnostic controller (lines 303-314)
**Status:** Not started  
**Review items:** Lines 303-314

Tasks:
- Extract state transitions from `BreadboardApp` into `src/ui-controller/`
- Define `AppState` and `Action` types
- Move simulation runner to controller layer
- Enable unit testing of controller without DOM

### Milestone 2 — Breadboard substrate in SVG (lines 315-320)
**Status:** Not started  
**Review items:** Lines 315-320

Tasks:
- Render holes/rails/labels in React/SVG
- Implement hover highlighting (row/rail net regions)
- Implement click-to-select for holes

### Milestone 3 — Component rendering and manipulation (lines 321-328)
**Status:** Not started  
**Review items:** Lines 321-328

Tasks:
- Render components in React/SVG
- Implement drag-to-move with snap-to-hole
- Implement rotation (R key + handle)
- Verify undo/redo compatibility

### Milestone 4 — Rete graph layer visible and aligned (lines 329-335)
**Status:** Not started  
**Review items:** Lines 329-335

Tasks:
- Integrate Rete editor in DOM
- Align Rete coordinate space with breadboard world space
- Implement pan/zoom synchronization

### Milestone 5 — Interactive wiring via Rete (lines 336-341)
**Status:** Not started  
**Review items:** Lines 336-341

Tasks:
- Implement Phase-3-style connection creation (drag leg → hole)
- Enforce one-connector-per-hole constraint
- Provide clear visual feedback during connection

### Milestone 6 — Overlays and explain panel parity (lines 342-350)
**Status:** Not started  
**Review items:** Lines 342-350

Tasks:
- Implement voltage overlay in React/SVG (heatmap or per-hole colors)
- Implement current animation (stroke dash offset or particles)
- Render error badges with click → explain integration

### Milestone 7 — Remove PixiJS (lines 351-364)
**Status:** Not started  
**Review items:** Lines 351-364

Tasks:
- Delete `src/ui/pixi-renderer.ts`
- Remove all Pixi-specific code paths
- Remove `pixi.js` from dependencies
- Update Playwright visual regression baselines
- Verify all unit tests pass

## Notes

- **No simulation changes:** PR #465 correctly avoided any changes to core simulation logic (`src/core/**`), component library (`src/library/**`), or existing PixiJS rendering (`src/ui/**`)
- **Backward compatibility:** Feature flag ensures safe incremental migration with ability to compare old and new UIs side-by-side
- **Clean foundation:** React infrastructure is minimal and focused, ready for subsequent milestones
- **Migration safety:** This is milestone 0 of 7; the migration plan remains on track

## Follow-up Actions

1. Begin Milestone 1: Extract renderer-agnostic controller (next priority)
2. Keep feature flag active until Milestone 7 completes
3. Monitor for any issues with dual-mode operation during migration
4. Update this file as each subsequent milestone completes
