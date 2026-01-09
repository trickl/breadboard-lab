Implement dark/light theme toggle in top-right corner

## Source Review
`planning/reviews/review-2026-01-08.md` - Section 10 (lines 194-198)

## Review Items Addressed

This task addresses **Section 10: Dark / Light Theme** from the review, which was identified as a "Medium Priority Improvement" in Section 12.

### Original Critique (Section 10, lines 194-198)

**Issue:**
- ❌ "A dark/light theme toggle should be placed in the **top-right corner**"
- ❌ "Use the existing React Light/Dark toggle component from your own NPM package"

**Requirements:**
1. Add theme toggle button positioned in top-right corner of the application
2. Use existing React Light/Dark toggle component from the project's own NPM package
3. Toggle should switch between dark and light themes
4. Theme preference should persist across sessions

## Context

This is the **only remaining unaddressed item** from the Medium Priority Improvements section of the review. All other items from the review (blocking issues, high priority UX improvements, and other medium priority items) have been completed in previous PRs:

- ✅ Blocking Issues: Complete (PRs #285, #291, #297)
- ✅ High Priority UX Improvements: Complete (PRs #285, #303, #309, #315, #321)
- ✅ Medium Priority: Breadboard visual realism (PR #327)
- ⏸️ Medium Priority: Dark/light theme toggle (THIS TASK)

## Implementation Instructions

### Step 1: Investigate existing NPM package

1. Check if the project owner (@trickl) has a published NPM package with a React Light/Dark toggle component
2. Search package.json and dependencies for any existing theme-related packages
3. Look for any references to theme components in the codebase
4. Check GitHub organization for related repositories containing UI component libraries

If an existing package is found:
- Install it as a dependency
- Import and use the component as specified in the review

If no existing package is found:
- Document this finding
- Ask the user for guidance on which package to use, or
- Implement a simple, clean theme toggle component that matches the application's visual style

### Step 2: Add theme toggle to top-right corner

**Location:** The toggle should be positioned in the top-right corner of the application UI

1. Identify the appropriate container/layout component for top-right positioning
2. Add the theme toggle button/component to this location
3. Ensure it's visible and accessible on all screens and at all viewport sizes
4. Position should be absolute or fixed in the top-right corner, clear of other UI elements

**Visual requirements:**
- Should be immediately visible and recognizable
- Should not obstruct other UI elements
- Should have appropriate spacing from edges (e.g., 16-24px margin)
- Should follow the application's existing visual design language

### Step 3: Implement theme switching functionality

1. **Theme state management:**
   - Add theme state to the application (likely in breadboard-app.ts or a theme context)
   - Support at least two themes: "dark" and "light"
   - Default theme should match the current application appearance (appears to be dark)

2. **CSS/styling approach:**
   - Option A: Use CSS variables (custom properties) for theme colors
   - Option B: Use CSS classes (.theme-dark, .theme-light) on root element
   - Option C: Use existing theme system if one is present
   - Choose the approach that best fits the existing codebase architecture

3. **Theme colors to support:**
   Based on existing UI elements, the theme should control:
   - Background colors (canvas, sidebars, panels)
   - Text colors (primary, secondary, labels)
   - Border colors
   - Button colors (normal, hover, active)
   - Panel/card backgrounds
   - Input/control colors
   - Selection/highlight colors
   
   Ensure good contrast ratios for accessibility (WCAG AA minimum: 4.5:1 for text, 3:1 for UI components)

4. **Toggle interaction:**
   - Clicking the toggle switches between dark and light themes
   - Visual feedback on toggle state (icon change, text change, or switch position)
   - Smooth transition between themes (CSS transitions on color properties, ~200-300ms)

### Step 4: Persist theme preference

1. Save theme preference to localStorage when changed
2. Load theme preference from localStorage on application initialization
3. Apply saved theme before initial render to avoid flash of wrong theme
4. Key suggestion: `breadboard-theme` or similar
5. Handle missing/invalid localStorage values gracefully (fallback to default)

**Code pattern:**
```typescript
// On theme change
localStorage.setItem('breadboard-theme', theme);

// On initialization
const savedTheme = localStorage.getItem('breadboard-theme') || 'dark';
applyTheme(savedTheme);
```

### Step 5: Test theme toggle

**Manual testing checklist:**
- [ ] Theme toggle appears in top-right corner
- [ ] Toggle is visible and accessible
- [ ] Clicking toggle switches theme immediately
- [ ] All UI elements update correctly in both themes
- [ ] Text remains readable in both themes (contrast check)
- [ ] Components, wires, and breadboard remain visible in both themes
- [ ] Theme preference persists after page reload
- [ ] Theme preference persists across browser sessions
- [ ] Smooth transition between themes (no flashing)
- [ ] Toggle state visually reflects current theme
- [ ] Works at different viewport sizes (responsive)
- [ ] Keyboard accessible (can be triggered with Enter/Space)

**Accessibility considerations:**
- Toggle should have appropriate ARIA labels
- Keyboard navigation support
- Focus indicators visible in both themes
- Sufficient color contrast in both themes

### Step 6: Update relevant documentation

If documentation exists for UI components or user interface:
- Document the theme toggle feature
- Note that theme preference is saved to localStorage
- Explain how to use the toggle

## Files Likely to Modify

Based on existing codebase structure:

1. **`src/ui/breadboard-app.ts`**
   - Add theme state management
   - Add theme persistence logic
   - Add UI for theme toggle button
   - Apply theme to root container

2. **`src/style.css`**
   - Define CSS variables or theme classes
   - Define color schemes for dark and light themes
   - Add transition effects for theme switching
   - Update existing color values to use theme variables

3. **`package.json`** (if using external package)
   - Add dependency for theme toggle component package

4. **`index.html`** (possibly)
   - May need to add theme class to root element
   - May need to add inline script to apply saved theme before render

## Constraints (from task template)

1. **Do not change the logic of code unless it has been identified as a clear bug**
   - Theme toggle is additive functionality, not a bug fix
   
2. **Do not maintain legacy endpoints for backwards compatibility**
   - Not applicable (UI-only feature)
   
3. **Always delete any leftover, unused code**
   - Remove any temporary or test code used during development
   
4. **Do not leave comments on changes made within the code**
   - Code should be self-documenting; use clear variable/function names
   
5. **Do not rewrite functions from scratch during refactors**
   - Not applicable (new feature, not refactor)
   
6. **Ensure all tests and linting pass after each change**
   - Run existing test suite to ensure no regressions
   - Run linter and fix any issues

## Success Criteria

✅ Task is complete when:
1. Theme toggle button is visible in top-right corner
2. Clicking toggle switches between dark and light themes
3. All UI elements are readable and functional in both themes
4. Theme preference persists across sessions via localStorage
5. Smooth visual transition between themes
6. All existing tests pass
7. Linting passes with no new warnings
8. Manual testing checklist complete

## Priority

**Medium Priority** - This is the final remaining item from the Medium Priority Improvements section of the review. It's a quality-of-life feature that improves user experience but is not blocking core functionality.

## Notes

- The review specifically mentions "Use the existing React Light/Dark toggle component from your own NPM package." If no such package exists, clarify with the user or implement a clean, simple toggle that fits the application's style.
- The application currently uses PixiJS for rendering (not React for the main canvas), so the toggle may need to be implemented in the HTML/CSS UI layer rather than as a React component.
- Consider that the breadboard canvas rendering (PixiJS) uses fixed colors for components, wires, and the breadboard. These may not need to change with theme—only the surrounding UI elements (sidebars, buttons, panels, text) should adapt to the theme.
- The breadboard itself might remain with the same visual appearance regardless of theme, with only the "chrome" (application UI) changing colors.

## Related Sections from Review

This task completes the review coverage:

**Section 10: Dark / Light Theme (lines 194-198)** ← THIS TASK
- Add theme toggle in top-right corner
- Use existing React Light/Dark toggle component from NPM package

**Section 12: Priority Summary - Medium Priority Improvements (lines 228-231)**
- ✅ Breadboard visual realism (PR #327)
- ✅ Hole sizing vs hit area (PR #327)
- ⏸️ Dark/light theme toggle (THIS TASK)

After this task is complete, **all actionable items from review-2026-01-08.md will be addressed**.
