# Set up React infrastructure for PixiJS removal (Milestone 0)

## Source Review
`planning/reviews/review-09-01-26-remove-pixijs-react-rete-rendering.md`

## Review Items Addressed
This task addresses **Milestone 0 — Project setup for React** from the source review (lines 290-302).

### Specific critique items from the review:
- **Setup React runtime environment**: The review specifies that we need React app rendering capability before any migration work can begin (lines 290-302).
- **Maintain backward compatibility during migration**: Keep existing PixiJS-based `BreadboardApp` functional behind a feature flag to allow comparison and safe incremental migration (line 298).
- **Establish TypeScript JSX configuration**: Add TypeScript JSX support via tsconfig updates (line 295).
- **Create React entry point**: Create `src/main.tsx` and mount React app into `#app` element (line 296).

### Outcome (from review)
React app renders "hello breadboard" without touching simulation logic. The existing PixiJS app remains fully functional.

## Detailed Implementation Instructions

### Context
The breadboard-lab project currently uses PixiJS (WebGL/Canvas) for all rendering, driven by an imperative controller (`BreadboardApp` → `PixiRenderer`). The goal is to migrate to a React + Rete.js rendering architecture while preserving all existing electrical simulation and digital simulation capabilities.

This is the **first milestone** in a 7-milestone migration plan. This task establishes the React foundation without breaking any existing functionality.

### Acceptance Criteria (from review, lines 299-301)
1. `npm run dev` shows a React-rendered page
2. Existing unit tests still pass
3. Feature flag allows toggling between old (PixiJS) and new (React) UI

### Step-by-Step Implementation

#### 1. Add React dependencies
Add to `package.json`:
- `react` (runtime)
- `react-dom` (DOM rendering)
- `@types/react` (TypeScript definitions)
- `@types/react-dom` (TypeScript definitions)

Use versions compatible with the project's existing toolchain (Vite + TypeScript).

**Specific command:**
```bash
npm install react react-dom
npm install --save-dev @types/react @types/react-dom
```

#### 2. Update TypeScript configuration for JSX
Modify `tsconfig.json`:
- Add `"jsx": "react-jsx"` to `compilerOptions` (modern React JSX transform, no need to import React)
- Ensure `.tsx` files are included in the compilation

**Specific changes to `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    // ... existing options
  }
}
```

#### 3. Create React entry point
Create new file: `src/main.tsx`

This file should:
- Import React and ReactDOM
- Import a new `<App/>` component (created in step 4)
- Mount the React app to the existing `#app` element in `index.html`
- Include a feature flag check to determine whether to render React or initialize the existing PixiJS app

**Template structure:**
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './ui-react/App';

// Feature flag - can be environment variable or query param
const USE_REACT_UI = new URLSearchParams(window.location.search).get('react') === 'true';

if (USE_REACT_UI) {
  // Mount React app
  const root = document.getElementById('app');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
} else {
  // Load existing PixiJS app
  // Import and initialize BreadboardApp as it currently works
  import('./main').then(module => {
    // Existing initialization code
  });
}
```

#### 4. Create basic React component structure
Create new directory: `src/ui-react/`

Create `src/ui-react/App.tsx`:
- Minimal React component
- Display "Hello Breadboard" or similar placeholder
- Include basic styling to confirm React is rendering
- **Do not** implement any breadboard functionality yet - this is just proving React works

**Template:**
```tsx
import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Breadboard Lab (React UI)</h1>
      <p>React infrastructure is ready. PixiJS migration in progress.</p>
      <p><a href="?react=false">Switch to legacy PixiJS UI</a></p>
    </div>
  );
}
```

#### 5. Preserve existing PixiJS entry point
Rename current `src/main.ts` to `src/main-legacy.ts` (or similar) to preserve it.

Ensure all existing initialization logic remains intact and functional when the feature flag is disabled.

#### 6. Update build configuration
Verify `vite.config.ts` supports both `.ts` and `.tsx` files without issues.

Add any necessary React-specific plugins if not already present (Vite typically includes React support by default with `@vitejs/plugin-react`).

**Check/add to `vite.config.ts`:**
```typescript
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ... existing config
});
```

#### 7. Update index.html if needed
Verify `index.html` has the `#app` element and update the script reference to point to `main.tsx` instead of `main.ts`.

**Change in `index.html`:**
```html
<!-- Old: -->
<script type="module" src="/src/main.ts"></script>

<!-- New: -->
<script type="module" src="/src/main.tsx"></script>
```

#### 8. Verify and test
- Run `npm run dev` with `?react=true` query parameter - should show React UI
- Run `npm run dev` with `?react=false` or no parameter - should show existing PixiJS UI
- Run existing test suite: `npm test` - all tests should pass
- Run build: `npm run build` - should succeed without errors

### Constraints (from issue template)
1. **Do not change simulation logic** - This task only sets up React infrastructure
2. **Do not maintain legacy endpoints** - The feature flag is temporary for migration safety, not a permanent dual-mode
3. **Delete unused code** - None in this task; we're preserving everything
4. **No comments in code** - Follow existing project style
5. **Do not rewrite functions** - This task is additive only
6. **Tests and linting must pass** - Verify at the end

### Refactor Safety (not applicable to this task)
This task is additive and doesn't involve moving existing code.

### Testing Strategy
- **Manual test**: Load app with `?react=true`, verify React UI displays
- **Manual test**: Load app without query param, verify PixiJS UI still works
- **Automated test**: Run `npm test`, verify all existing tests pass
- **Build test**: Run `npm run build`, verify no compilation errors

### Definition of Done
- [ ] React and React DOM dependencies installed
- [ ] TypeScript configured for JSX compilation
- [ ] `src/main.tsx` created with feature flag logic
- [ ] `src/ui-react/App.tsx` created with minimal placeholder UI
- [ ] Existing PixiJS app preserved and functional
- [ ] `npm run dev` works with both `?react=true` and `?react=false`
- [ ] All existing tests pass
- [ ] Build succeeds without errors
- [ ] No changes to any simulation or core logic files

## Related Architecture Decision Records
From the review:
- **DR-4 (lines 124-132)**: Controller logic split will happen in future milestones; this task just establishes React infrastructure
- The review explicitly states this milestone should "keep existing BreadboardApp behind a feature flag for comparison" (line 298)

## Non-Goals
- Do NOT implement any breadboard rendering in React yet
- Do NOT modify any simulation code
- Do NOT remove or refactor any PixiJS code
- Do NOT integrate Rete.js yet
- Do NOT implement any UI interactions

This is purely infrastructure setup to enable subsequent migration milestones.
