Document actual rendering technology stack and update planning documentation

## Context

This task addresses **Section 7: Rendering & Technology Concerns** from `planning/reviews/review-2026-01-08.md` (lines 137-146).

The review identifies a discrepancy between the intended technology stack and the actual implementation. The application is built with PixiJS, but there may have been an expectation or earlier plan to use React + Konva instead.

## Review Items Being Addressed

### Section 7: Rendering & Technology Concerns (Lines 137-146)

**Original Issue:**
- The application is intended to use **React + Konva**.
- Visually, it still appears to behave like **PixiJS**.
- This needs confirmation:
  - Either the migration is incomplete
  - Or the visual output does not yet reflect the new rendering stack

**Current State (as of 2026-01-09):**
- The application is built with **vanilla TypeScript + PixiJS** (verified in `package.json`)
- There is NO React in the dependencies
- There is NO Konva in the dependencies
- PixiJS 8.6.6 is the rendering engine
- The application is NOT using React components or JSX
- All UI is vanilla TypeScript with DOM manipulation

**Conclusion:**
The review's statement that "the application is intended to use React + Konva" appears to be based on outdated or incorrect information. The actual codebase has always used (or has been migrated to use) vanilla TypeScript + PixiJS.

## Task Description

This is a **documentation-only task**. No code changes are required.

The task is to:
1. Clarify the actual technology stack in planning documentation
2. Update any documents that incorrectly state React + Konva as the intended stack
3. Document the rationale for using PixiJS over Konva (if such rationale exists in commit history or documentation)
4. Ensure consistency across all planning and architecture documents

## Detailed Instructions

### Step 1: Review Planning Documentation

Read and identify any mentions of React + Konva or rendering technology choices in:
- `/home/runner/work/breadboard-lab/breadboard-lab/planning/00-planning.md`
- `/home/runner/work/breadboard-lab/breadboard-lab/ARCHITECTURE.md`
- Any other relevant planning or architecture documents in the repository

**Search patterns:**
- "React"
- "Konva"
- "react-konva"
- "rendering"
- "PixiJS"
- "Pixi"

### Step 2: Document Actual Technology Stack

If the planning documents currently mention React + Konva as the intended stack:
1. **Update those sections** to reflect the actual implementation (vanilla TypeScript + PixiJS)
2. **Add a clarification note** explaining that:
   - The application uses vanilla TypeScript (not React)
   - The rendering engine is PixiJS 8.6.6 (not Konva)
   - This architecture decision enables WebGL-accelerated rendering without React framework overhead

If the planning documents already correctly state PixiJS:
1. **Verify consistency** across all mentions of rendering technology
2. **Add explicit confirmation** in the frontend architecture section that PixiJS is the chosen rendering solution

### Step 3: Address Section 7 Specifically

In the planning documentation, add a section or note that addresses the review's concern:

**Example addition to ARCHITECTURE.md or 00-planning.md:**

```markdown
### Rendering Technology Stack

**Current Implementation:** PixiJS 8.6.6 with vanilla TypeScript

The application uses PixiJS as its rendering engine, not React + Konva. This architectural decision was made to:
- Leverage WebGL acceleration for high-performance breadboard rendering
- Avoid React framework overhead for a canvas-heavy application
- Use a mature, well-documented 2D rendering library with excellent TypeScript support
- Enable fine-grained control over rendering pipeline and hit detection

**Response to Review Feedback (Section 7):**
A review (2026-01-08) noted a perceived discrepancy between "intended" technology (React + Konva) and "actual" technology (PixiJS). This was based on outdated or incorrect assumptions. The application has been built with PixiJS from the beginning (or migrated to PixiJS early in development), and there is no incomplete migration. The current stack is the intended and final architecture.
```

### Step 4: Update Review Actions File

Once documentation is updated, add an entry to `planning/reviews/review-2026-01-08.actions.md` documenting the resolution:

```markdown
## Documentation Update: Clarify Rendering Technology Stack

**Date:** 2026-01-09  
**Branch:** [insert branch name]

### Review Items Addressed

This update **fully resolves** Section 7 (Rendering & Technology Concerns) from the review.

#### Section 7: Rendering & Technology Concerns (RESOLVED ✅)

**Original Issue (lines 137-146):**
- ❌ "The application is intended to use **React + Konva**"
- ❌ "Visually, it still appears to behave like **PixiJS**"
- ❌ "This needs confirmation: Either the migration is incomplete or the visual output does not yet reflect the new rendering stack"

**Resolution:**

The review's statement about React + Konva was based on outdated or incorrect information. Investigation of the codebase confirms:

1. **package.json dependencies:**
   - PixiJS 8.6.6 is present
   - React is NOT present
   - Konva is NOT present

2. **Source code structure:**
   - All UI code is vanilla TypeScript (`src/ui/breadboard-app.ts`, `src/ui/pixi-renderer.ts`)
   - No JSX, no React components, no React hooks
   - Direct DOM manipulation for UI chrome (sidebars, buttons, panels)
   - PixiJS for canvas rendering (breadboard, components, wires, overlays)

3. **Architectural consistency:**
   - Planning documents have been updated to explicitly state PixiJS as the rendering technology
   - ARCHITECTURE.md now clarifies the technology stack and rationale
   - No "incomplete migration" exists—PixiJS is the intended and complete implementation

**Results:**
- ✅ Technology stack clearly documented in planning files
- ✅ No discrepancy between intended and actual rendering technology
- ✅ Review concern resolved: PixiJS is the correct and complete implementation

**Status:** Section 7 (Rendering & Technology Concerns) is **RESOLVED** ✅
```

## Constraints

1. **Do NOT modify code** - this is a documentation-only task
2. **Do NOT change the rendering technology** - PixiJS is the correct choice and implementation
3. **Do NOT introduce new architectural decisions** - only document what already exists
4. **Ensure factual accuracy** - all statements must be verifiable by inspecting package.json and source code

## Success Criteria

- [ ] Planning documentation accurately reflects actual technology stack (vanilla TypeScript + PixiJS)
- [ ] All mentions of rendering technology are consistent across documents
- [ ] A clear statement addresses the review's Section 7 concern
- [ ] Review actions file (`review-2026-01-08.actions.md`) includes resolution entry for Section 7
- [ ] No code changes made (documentation only)
- [ ] All claims about technology stack are verifiable in package.json and source files

## Expected Files Modified

- `planning/00-planning.md` (if it mentions React + Konva incorrectly)
- `ARCHITECTURE.md` (if it mentions React + Konva incorrectly, or to add clarification)
- `planning/reviews/review-2026-01-08.actions.md` (add Section 7 resolution entry)
- Possibly other planning documents if they contain rendering technology references

## Notes

This task exists because the review (Section 7) questioned whether the application was using the "intended" technology. Investigation shows:
- The reviewer may have had outdated information about the technology roadmap
- OR there may have been an early plan to use React + Konva that was abandoned
- OR the planning documentation may have contained incorrect statements

Regardless of the cause, the task is to ensure the documentation accurately reflects reality: the application uses vanilla TypeScript + PixiJS, and this is the intended architecture.
