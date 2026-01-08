Implement Quick Select Component Bar for Immediate Component Access

---

## Overview

The goal.md specification (Section 12) explicitly requires a **Quick Select Component Bar** to make the tool "usable within seconds" by displaying commonly-used components prominently without requiring modal navigation. Currently, the system uses a "📦 Component Library" button that opens a searchable modal, requiring multiple clicks and search operations before users can place their first component. This contradicts the explicit design goal of immediate usability.

This task implements the missing Quick Select Component Bar as specified in goal.md Section 12.1-12.3.

---

## Problem Statement

**Current State:**
- Single "📦 Component Library" button in left toolbar
- Requires 3+ steps to place first component: (1) Click library button, (2) Search/browse modal, (3) Select component
- No quick access to frequently-used components
- No customization of favorite components
- Modal-based workflow interrupts visual focus on breadboard

**Target State (from goal.md Section 12):**
- Quick Select bar displayed prominently on initial load
- Default items: LED, Wire (red), Resistor, Switch, Battery/power source
- Users can favorite components from library
- Users can remove items from quick select
- Quick select reflects favorites dynamically

**Gap:**
Section 12 of goal.md explicitly states "The tool must be usable **within seconds**" and describes a specific UI pattern (Quick Select bar) that does NOT exist in the current system. The modal-based library browser contradicts the immediate-access design intent.

---

## Requirements

### Functional Requirements

1. **Quick Select Bar UI Component**
   - Horizontal toolbar section displaying 5-8 component buttons
   - Located in left toolbar, positioned above existing "📦 Component Library" button
   - Each button shows component icon/preview and name
   - Click button to select component type (same behavior as library selection)
   - Visual indicator for currently selected component type

2. **Default Component Set**
   - LED (3mm yellow or 5mm red from library)
   - Wire (red, 22 AWG solid core)
   - Resistor (220Ω or 1kΩ default)
   - Switch (SPST)
   - Battery/Power Supply (5V)
   - These 5 components must be available immediately on first load

3. **Favorites System**
   - "⭐ Add to Quick Select" button in component library browser modal
   - Click to add component to Quick Select bar
   - Maximum 8 components in Quick Select bar (prevents UI overflow)
   - When at capacity, show message: "Quick Select is full. Remove a component first."
   - "✕" remove button on each Quick Select item (appears on hover)
   - Removal button excludes default 5 components (cannot be removed)

4. **Dynamic Updates**
   - Adding favorite: component button appears in Quick Select bar immediately
   - Removing favorite: component button disappears, bar reflows
   - Quick Select state persists in localStorage (key: "quickSelectComponents")
   - Default components always present, custom favorites append after defaults

5. **Visual Design**
   - Component buttons: 60px × 60px with icon centered
   - Text label below icon (component name, truncated if > 10 chars)
   - Hover effect: scale 1.05, drop-shadow
   - Selected state: blue border (3px solid #4169e1)
   - Remove button (✕): top-right corner, red background, appears on hover
   - Vertical scrolling if > 8 components (unlikely but handle gracefully)

6. **Integration with Existing Workflow**
   - Clicking Quick Select button selects component type (same as library selection)
   - Floating component workflow proceeds identically (drag body, connect legs to holes)
   - Library browser modal remains accessible for full catalog browsing
   - Quick Select does not replace library browser, it complements it

### Non-Functional Requirements

1. **Performance**
   - Quick Select bar renders in < 50ms on initial load
   - No performance impact on component placement workflow
   - localStorage operations debounced (300ms) to avoid excessive writes

2. **Accessibility**
   - Keyboard navigation: Tab to cycle through Quick Select buttons
   - Enter/Space to select component
   - Visual focus indicator on keyboard focus
   - Screen reader labels for each component button

3. **Backward Compatibility**
   - Library browser modal remains fully functional
   - Existing component placement tests unaffected
   - Quick Select is purely additive (no breaking changes)

---

## Acceptance Criteria

1. ✅ On first load, Quick Select bar displays 5 default components (LED, Wire, Resistor, Switch, Power Supply)
2. ✅ Clicking a Quick Select button selects that component type for placement
3. ✅ Component library browser modal shows "⭐ Add to Quick Select" button for each component
4. ✅ Adding a component to Quick Select immediately shows it in the bar (up to 8 total)
5. ✅ Hovering over custom (non-default) Quick Select items shows "✕" remove button
6. ✅ Clicking remove button removes component from Quick Select and updates UI
7. ✅ Quick Select state persists across browser sessions (localStorage)
8. ✅ Default 5 components cannot be removed from Quick Select
9. ✅ Keyboard navigation works (Tab to cycle, Enter/Space to select)
10. ✅ Visual feedback: selected component shows blue border in Quick Select bar

---

## Technical Design

### Data Model

```typescript
// src/core/types.ts additions

/**
 * Quick Select component entry
 */
export interface QuickSelectComponent {
  libraryId: string;         // References ComponentLibraryEntry.id
  isDefault: boolean;         // True for default 5, false for user favorites
  order: number;              // Display order (defaults 0-4, favorites 5+)
}

/**
 * Quick Select state persisted to localStorage
 */
export interface QuickSelectState {
  components: QuickSelectComponent[];  // Max 8 entries
}
```

### Quick Select Manager

```typescript
// src/core/quick-select-manager.ts (NEW FILE)

import { componentLibrary } from './component-library';
import type { QuickSelectComponent, QuickSelectState } from './types';

const DEFAULT_COMPONENTS: QuickSelectComponent[] = [
  { libraryId: 'led-3mm-yellow', isDefault: true, order: 0 },
  { libraryId: 'wire-22awg-red', isDefault: true, order: 1 },
  { libraryId: 'resistor-220-5', isDefault: true, order: 2 },
  { libraryId: 'switch-spst', isDefault: true, order: 3 },
  { libraryId: 'power-5v', isDefault: true, order: 4 },
];

const STORAGE_KEY = 'quickSelectComponents';
const MAX_COMPONENTS = 8;

export class QuickSelectManager {
  private components: QuickSelectComponent[] = [];

  constructor() {
    this.load();
  }

  /**
   * Load Quick Select state from localStorage or use defaults
   */
  load(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state: QuickSelectState = JSON.parse(stored);
        this.components = state.components;
        this.validateAndRepair();
      } catch {
        this.components = [...DEFAULT_COMPONENTS];
      }
    } else {
      this.components = [...DEFAULT_COMPONENTS];
    }
  }

  /**
   * Save Quick Select state to localStorage
   */
  save(): void {
    const state: QuickSelectState = { components: this.components };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Get all Quick Select components
   */
  getComponents(): QuickSelectComponent[] {
    return [...this.components];
  }

  /**
   * Add component to Quick Select (if not at capacity)
   */
  addComponent(libraryId: string): boolean {
    if (this.components.length >= MAX_COMPONENTS) {
      return false; // At capacity
    }
    if (this.components.some(c => c.libraryId === libraryId)) {
      return false; // Already exists
    }
    const entry = componentLibrary.get(libraryId);
    if (!entry) {
      return false; // Invalid library ID
    }
    
    const newComponent: QuickSelectComponent = {
      libraryId,
      isDefault: false,
      order: this.components.length,
    };
    this.components.push(newComponent);
    this.save();
    return true;
  }

  /**
   * Remove component from Quick Select (if not default)
   */
  removeComponent(libraryId: string): boolean {
    const component = this.components.find(c => c.libraryId === libraryId);
    if (!component || component.isDefault) {
      return false; // Cannot remove defaults
    }
    
    this.components = this.components.filter(c => c.libraryId !== libraryId);
    this.reorder();
    this.save();
    return true;
  }

  /**
   * Check if component is in Quick Select
   */
  hasComponent(libraryId: string): boolean {
    return this.components.some(c => c.libraryId === libraryId);
  }

  /**
   * Check if at capacity
   */
  isAtCapacity(): boolean {
    return this.components.length >= MAX_COMPONENTS;
  }

  /**
   * Reorder components after removal
   */
  private reorder(): void {
    this.components.forEach((c, index) => {
      c.order = index;
    });
  }

  /**
   * Validate and repair corrupted state
   */
  private validateAndRepair(): void {
    // Ensure all default components exist
    const defaults = DEFAULT_COMPONENTS.filter(
      d => !this.components.some(c => c.libraryId === d.libraryId)
    );
    this.components = [...defaults, ...this.components];

    // Validate library IDs
    this.components = this.components.filter(c => 
      componentLibrary.get(c.libraryId) !== undefined
    );

    // Enforce max capacity
    if (this.components.length > MAX_COMPONENTS) {
      this.components = this.components.slice(0, MAX_COMPONENTS);
    }

    this.reorder();
  }
}

export const quickSelectManager = new QuickSelectManager();
```

### UI Integration

**BreadboardApp modifications** (src/ui/breadboard-app.ts):

```typescript
import { quickSelectManager } from '../core/quick-select-manager';

// In constructor, after setupUI():
this.renderQuickSelectBar();

// New method:
private renderQuickSelectBar(): void {
  const quickSelectContainer = document.getElementById('quick-select-container');
  if (!quickSelectContainer) return;

  quickSelectContainer.innerHTML = ''; // Clear existing

  const components = quickSelectManager.getComponents();
  components.forEach(qsComponent => {
    const entry = componentLibrary.get(qsComponent.libraryId);
    if (!entry) return;

    const button = document.createElement('button');
    button.className = 'quick-select-item';
    button.dataset.libraryId = qsComponent.libraryId;
    button.tabIndex = 0;
    button.setAttribute('aria-label', `Select ${entry.name}`);

    // Icon (simplified, just text for now; can enhance with SVG)
    const icon = document.createElement('div');
    icon.className = 'quick-select-icon';
    icon.textContent = entry.name.charAt(0).toUpperCase();
    button.appendChild(icon);

    // Label
    const label = document.createElement('div');
    label.className = 'quick-select-label';
    label.textContent = entry.name.length > 10 
      ? entry.name.substring(0, 10) + '…' 
      : entry.name;
    button.appendChild(label);

    // Remove button (for non-defaults)
    if (!qsComponent.isDefault) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'quick-select-remove';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', `Remove ${entry.name} from Quick Select`);
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        quickSelectManager.removeComponent(qsComponent.libraryId);
        this.renderQuickSelectBar();
      };
      button.appendChild(removeBtn);
    }

    // Click handler
    button.onclick = () => {
      this.selectComponentType(qsComponent.libraryId);
      // Visual feedback: highlight selected
      document.querySelectorAll('.quick-select-item').forEach(btn => {
        btn.classList.remove('selected');
      });
      button.classList.add('selected');
    };

    // Keyboard handler
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });

    quickSelectContainer.appendChild(button);
  });
}

// Modify renderComponentLibraryBrowser to add "Add to Quick Select" button
// Add after each component card:
const addToQuickSelectBtn = document.createElement('button');
addToQuickSelectBtn.className = 'add-to-quick-select';
addToQuickSelectBtn.textContent = quickSelectManager.hasComponent(entry.id) 
  ? '★ In Quick Select' 
  : '☆ Add to Quick Select';
addToQuickSelectBtn.disabled = quickSelectManager.hasComponent(entry.id);

addToQuickSelectBtn.onclick = (e) => {
  e.stopPropagation();
  if (quickSelectManager.isAtCapacity()) {
    alert('Quick Select is full (8 components max). Remove a component first.');
    return;
  }
  const added = quickSelectManager.addComponent(entry.id);
  if (added) {
    this.renderQuickSelectBar();
    addToQuickSelectBtn.textContent = '★ In Quick Select';
    addToQuickSelectBtn.disabled = true;
  }
};
```

### HTML Structure

**index.html modifications:**

```html
<!-- Add Quick Select container in left toolbar, before component library button -->
<div id="quick-select-container" class="quick-select-bar">
  <!-- Dynamically populated by renderQuickSelectBar() -->
</div>

<button id="component-library-btn" class="toolbar-btn">
  📦 Component Library
</button>
```

### CSS Styling

**src/style.css additions:**

```css
/* Quick Select Bar */
.quick-select-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px;
  border-bottom: 1px solid #444;
  background: #2a2a2a;
}

.quick-select-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  padding: 4px;
  background: #3a3a3a;
  border: 2px solid #555;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
  font-size: 12px;
}

.quick-select-item:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-color: #777;
}

.quick-select-item:focus {
  outline: 2px solid #4169e1;
  outline-offset: 2px;
}

.quick-select-item.selected {
  border: 3px solid #4169e1;
  background: #4a4a4a;
}

.quick-select-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #4169e1;
}

.quick-select-label {
  font-size: 10px;
  color: #ccc;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.quick-select-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: #e74c3c;
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 10px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.quick-select-item:hover .quick-select-remove {
  display: flex;
}

.quick-select-remove:hover {
  background: #c0392b;
}

.add-to-quick-select {
  margin-top: 8px;
  padding: 6px 12px;
  background: #4169e1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.add-to-quick-select:hover:not(:disabled) {
  background: #5179f1;
}

.add-to-quick-select:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
}
```

---

## Implementation Plan

### Phase 1: Core Quick Select Manager (2-3 hours)
1. Create `src/core/quick-select-manager.ts`
2. Implement QuickSelectManager class with load/save/add/remove methods
3. Add QuickSelectComponent and QuickSelectState to `src/core/types.ts`
4. Write unit tests for QuickSelectManager (15 tests minimum)
5. Verify localStorage persistence and validation

### Phase 2: UI Integration (3-4 hours)
1. Add Quick Select container to index.html
2. Implement `renderQuickSelectBar()` in BreadboardApp
3. Add click handlers for component selection
4. Add keyboard navigation handlers
5. Integrate with existing `selectComponentType()` method
6. Test component selection flow end-to-end

### Phase 3: Library Browser Integration (2-3 hours)
1. Modify `renderComponentLibraryBrowser()` to add "Add to Quick Select" buttons
2. Implement add-to-Quick-Select handler
3. Handle capacity limit (8 components max)
4. Update button state dynamically (in Quick Select vs. not)
5. Test add/remove workflow

### Phase 4: Styling and Polish (2-3 hours)
1. Add CSS for Quick Select bar layout
2. Style component buttons (icon, label, hover, selected)
3. Style remove buttons (✕)
4. Add keyboard focus indicators
5. Test responsive behavior and scrolling

### Phase 5: Testing and Documentation (2-3 hours)
1. Write unit tests for QuickSelectManager (load, save, add, remove, validation)
2. Write integration tests for UI interactions
3. Update README.md with Quick Select usage
4. Update ARCHITECTURE.md with Quick Select design
5. Manual testing: verify all acceptance criteria

**Total estimated effort:** 11-16 hours (1-2 days)

---

## Testing Strategy

### Unit Tests

**src/core/__tests__/quick-select-manager.test.ts** (NEW FILE)

Test cases:
1. Initialize with defaults when localStorage empty
2. Load persisted state from localStorage
3. Add component successfully when below capacity
4. Reject add when at capacity (8 components)
5. Reject add when component already exists
6. Remove custom component successfully
7. Reject remove for default components
8. Reorder components after removal
9. Validate and repair corrupted state (invalid library IDs)
10. Save state to localStorage after add/remove
11. Check hasComponent() returns correct boolean
12. Check isAtCapacity() returns correct boolean
13. Handle JSON parse errors gracefully
14. Ensure default components always present
15. Enforce max capacity constraint

### Integration Tests

**src/ui/__tests__/quick-select-ui.test.ts** (NEW FILE)

Test cases:
1. Quick Select bar renders on app initialization
2. Default 5 components displayed correctly
3. Clicking Quick Select button selects component type
4. Remove button appears on hover for custom components
5. Remove button absent for default components
6. Clicking remove button updates bar immediately
7. Keyboard navigation (Tab, Enter, Space) works
8. Selected component shows blue border
9. Add to Quick Select from library browser updates bar
10. Capacity limit prevents adding 9th component

### Manual Verification

Checklist:
- [ ] Quick Select bar visible on first load
- [ ] 5 default components present (LED, Wire, Resistor, Switch, Power Supply)
- [ ] Clicking Quick Select button selects component for placement
- [ ] Floating component workflow proceeds normally after Quick Select
- [ ] Add to Quick Select from library browser works
- [ ] Remove custom component from Quick Select works
- [ ] Cannot remove default components
- [ ] Capacity limit enforced (8 max)
- [ ] State persists across browser refresh
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Visual feedback: selected border, hover effects, remove button

---

## Migration and Rollout

### Backward Compatibility

- Quick Select is purely additive (no breaking changes)
- Library browser modal remains fully functional
- Existing component placement tests unaffected
- localStorage key is new, no conflicts with existing keys

### User Migration

- First-time users: see default 5 components immediately
- Existing users: Quick Select appears automatically on next load with defaults
- No user action required to adopt feature
- Users can ignore Quick Select and continue using library browser

### Rollout Plan

1. Merge Quick Select implementation to main branch
2. Deploy to production immediately (no staged rollout needed)
3. Monitor localStorage usage and error rates
4. Collect user feedback on component selection workflow
5. Iterate on component icons and visual design based on feedback

---

## Future Enhancements (Out of Scope)

These enhancements are NOT part of this task but could be considered in future iterations:

1. **Custom component icons:** Replace text placeholders with actual component SVG icons
2. **Drag-to-reorder:** Allow users to reorder Quick Select items via drag-and-drop
3. **Multiple Quick Select sets:** Allow users to create named sets (e.g., "Digital", "Analog", "Power")
4. **Quick Select profiles:** Save/load Quick Select configurations
5. **Smart suggestions:** Analyze user's most-used components and suggest additions
6. **Import/export:** Share Quick Select configurations between users
7. **Tooltips:** Show component specs on hover (voltage, resistance, etc.)
8. **Recently used:** Auto-add recently placed components to Quick Select

---

## References

- **Goal.md Section 12:** Quick Select Component Bar specification (lines 329-367)
- **System Capabilities:** Current component library browser implementation (lines 17-47)
- **Component Library:** 37 real-world components available for Quick Select (lines 52-86)
- **Interactive Workflow:** Phase 3e completion enables immediate component placement (lines 3690-3720)

---

## Success Criteria

This task is complete when:

1. ✅ Quick Select bar displays 5 default components on first load
2. ✅ Users can select component from Quick Select with single click
3. ✅ Component placement workflow proceeds identically after Quick Select
4. ✅ Users can add components to Quick Select from library browser (up to 8 total)
5. ✅ Users can remove custom components from Quick Select
6. ✅ Default components cannot be removed
7. ✅ Quick Select state persists across browser sessions
8. ✅ All 15 unit tests pass for QuickSelectManager
9. ✅ All 10 integration tests pass for Quick Select UI
10. ✅ README.md and ARCHITECTURE.md updated with Quick Select documentation
11. ✅ Visual design matches specification (60px buttons, hover effects, selected state)
12. ✅ Keyboard navigation works (Tab, Enter, Space)
13. ✅ Zero breaking changes to existing functionality

When all success criteria are met, the gap identified in goal.md Section 12 will be closed, and the tool will be "usable within seconds" as specified.
