# Breadboard Visual Design Spec (Photo-Reference Match)

**Document purpose**

This document specifies the **visual layout** and **rendering appearance** of the breadboard UI so it closely matches the provided photo reference ("classic white solderless breadboard" with side power rails, center trench, labels, and printed rail stripes).

This spec is intentionally **implementation-oriented**: it defines **grid counts**, **coordinate systems**, **layering order**, **hole geometry**, **print markings**, **materials/shading**, and **acceptance checks**.

> Note on provenance/licensing: This spec describes _general visual traits_ of a solderless breadboard photo reference. Do **not** reuse or trace third-party copyrighted artwork. The implementation should be procedurally rendered or drawn from scratch.

---

## 1) Visual overview (what we are matching)

The reference image depicts a single breadboard in portrait orientation with:

- Off-white / cool light-gray **matte plastic**.
- Two **outer power-rail blocks** (left and right), each containing two vertical rails.
- A central **terminal strip region** split into left and right halves by a **vertical center trench**.
- Printed **row numbers (1–30)** and column letters (**a–e** on the left, **f–j** on the right) printed at top and bottom.
- Printed **rail stripes** (red and blue) on each power-rail block.
- Printed **polarity symbols** (+ in red, − in blue) at top and bottom of each rail block.
- Subtle **depth cues**: beveled holes, soft shadows, a darker recess in the center trench, and slight real-world imperfections (very mild smudges/specks).

The overall result must read as **physical plastic with recessed holes**, not a flat schematic grid.

---

## 2) Coordinate system and canonical layout units

### 2.1 Canonical coordinate system

Define a local coordinate system for breadboard rendering:

- Origin: top-left of the breadboard **outer plastic body** (including border).
- Units: **layout units** (LU). One LU maps to device pixels via scaling.

### 2.2 Primary grid pitch

Define `pitch` as the uniform spacing between adjacent holes within a region.

- Terminal region row pitch: `pitchY`.
- Terminal region column pitch: `pitchX`.

The reference image shows a consistent pitch across terminal holes. Rail holes also appear pitched similarly, but may be offset/packed differently due to the rail block width.

**Rule:** In the renderer, all hole centers must lie on mathematically exact grid coordinates; any photoreal “organic” feel must come from _shading/noise_, not from misaligned hole positions.

---

## 3) Hole grid specification (counts and topology)

### 3.1 Terminal strip region

The terminal region is a classic `5 + gap + 5` layout.

- Rows: **30**
- Left columns: **5** labeled `a b c d e`
- Right columns: **5** labeled `f g h i j`

Total terminal holes:

- Per row: `10`
- Total: `30 × 10 = 300`

#### 3.1.1 Column labels placement

- Column labels appear at both the **top** and **bottom** of the terminal region.
- Alignment: centered above/below each terminal column.
- Text color: dark gray/black.
- Font: clean sans-serif, small.

#### 3.1.2 Row labels placement

- Row labels show **1–30** along both sides of the terminal region.
- In the reference, numbers are printed near the trench-side margins.
- Alignment: vertically centered with each row.
- Text color: dark gray/black.

### 3.2 Center trench

Between columns `e` and `f` is a recessed vertical trench.

- The trench is a **depth feature**, not merely a spacing gap.
- It must have:
  - a darker fill tone,
  - inner shadowing to imply recess,
  - subtle seam/scuff texture.

### 3.3 Power rail regions (outer rails)

There are two side blocks:

- Left power rail block: 2 rails (red = +, blue = −)
- Right power rail block: 2 rails (red = +, blue = −)

Each block contains:

- 2 vertical hole columns (one associated to red stripe, one to blue stripe).

#### 3.3.1 Rail hole counts and gaps (normative approach)

The reference photo clearly shows that rails are **split** with visible **gaps** (missing rows of holes) producing separate rail segments.

Because photo-based exact counting is ambiguous without measurement, define the rail layout **normatively** as follows (chosen to match what is visually present and what users expect):

- Rail columns use **30 row positions** aligned to the terminal rows.
- Each rail column has **two breaks**:
  1. **Mid split** near the center, removing `gapA` consecutive positions.
  2. **Lower larger blank/notch** further down, removing `gapB` consecutive positions.

Recommended defaults (tunable, but must be consistent left/right):

- `gapA = 2` (mid split)
- `gapB = 4` (lower notch)

This yields per rail column:

- `railCount = 30 - gapA - gapB = 24`

Per rail block:

- `2 × 24 = 48` holes

Both rail blocks:

- `2 × 48 = 96` rail holes

**Total board holes (default):** `300 + 96 = 396`

> Implementation note: Keep these as configuration constants so the visual skin can be tuned without refactoring.

#### 3.3.2 Gap placement

Place gaps at fixed row indices so they appear visually where they do in the reference.

Recommended placements (1-based row indexing):

- Mid split (`gapA=2`): remove rail holes at rows **13–14**.
- Lower notch (`gapB=4`): remove rail holes at rows **23–26**.

These placements roughly match the reference’s mid-height short gap and lower larger interruption.

**Acceptance check:** When zoomed out, each rail block must show a short interruption around mid-height and a bigger interruption lower down.

---

## 4) Physical body geometry (borders, regions, and spacing)

### 4.1 Outer body and border

- The board has an outer plastic body with a slim border/rim.
- Corners are slightly rounded.

Define:

- `bodyRect`: full board rectangle.
- `borderInset`: inset for inner features to avoid drawing holes into the rim.

### 4.2 Region blocks

From left to right:

1. Left rail block (narrow)
2. Left terminal block (`a–e`)
3. Center trench (gap + recess)
4. Right terminal block (`f–j`)
5. Right rail block (narrow)

Each block should be visually distinct via subtle shading and seams.

### 4.3 Center trench geometry

- Trench width is greater than the inter-column gap between adjacent terminal columns.
- Trench should include:
  - a darker central band,
  - inner shadow gradients on both sides,
  - optional subtle vertical “seam” line.

---

## 5) Hole geometry (shape, bevel, and depth)

The holes are not perfect circles. They appear as **rounded squares / rounded rectangles** with bevel shading.

### 5.1 Shape

For each hole:

- Outer opening: rounded-rect “squircle-ish” shape.
- Inner cavity: darker rounded-rect inset.

Recommended parameters (relative to pitch):

- `holeOuterSize = 0.42 * min(pitchX, pitchY)`
- `holeInnerSize = 0.28 * min(pitchX, pitchY)`
- `cornerRadiusOuter = 0.10 * holeOuterSize`
- `cornerRadiusInner = 0.12 * holeInnerSize`

### 5.2 Bevel and lighting model

Assume a soft directional light from **upper-left**.

Render hole depth via 3-layer approach:

1. **Rim highlight** (thin stroke or gradient): brighter on upper-left.
2. **Bevel ring** (mid tone): gradient toward lower-right.
3. **Cavity** (dark): near-black/dark gray fill with subtle highlight at upper-left edge.

**Rule:** The bevel must be consistent for all holes in a region (no random light direction).

---

## 6) Materials and shading (plastic + print)

### 6.1 Plastic base

Plastic appearance requirements:

- Matte off-white with slight cool tint.
- Subtle global shading gradient (slightly brighter upper-left, slightly darker lower-right).
- Optional faint noise/grain to avoid “flat vector” look.

Suggested palette (tunable):

- Plastic base: `#f2f3f5`
- Plastic shadow: `#d9dde2`
- Plastic highlight: `#ffffff`
- Trench base: `#cfd4da`
- Trench shadow: `#b5bcc4`

### 6.2 Printed markings (letters/numbers)

- Printed text is crisp but not pure black.
- Use dark gray (e.g., `#2e2e2e` to `#404040`).
- Apply a very subtle blur/soften (or subpixel AA) so it reads like ink on plastic, not laser-cut.

### 6.3 Rail stripes and polarity

Each rail block shows two vertical stripes:

- Red stripe near the inner-left side of the rail block.
- Blue stripe near the inner-right side of the rail block.

Suggested colors:

- Red: `#d23b3b`
- Blue: `#1f5fbf`

Polarity symbols:

- Red `+` near red stripe
- Blue `−` near blue stripe
- Symbols at both top and bottom

Stripe rendering:

- Solid fill with slightly softened edges.
- Thickness: visually prominent but not heavy; target `stripeWidth ≈ 0.06 * railBlockWidth`.

---

## 7) Alignment and spacing rules

### 7.1 Terminal holes alignment

- Hole centers must align exactly to `rows 1..30` and `columns a..j`.
- The `a–e` columns are contiguous.
- The `f–j` columns are contiguous.
- The trench provides a larger separation between `e` and `f` than the normal inter-column pitch.

### 7.2 Rail holes alignment

- Rail hole centers should align to the same `row` Y coordinates as terminal holes.
- Rail columns are vertically aligned with terminal rows.
- Gap rows remove holes entirely (no ghost/blank hole outlines).

### 7.3 Print alignment

- Column labels centered over columns.
- Row numbers centered per row.
- Polarity symbols aligned with stripes and placed in the border area above/below the rail holes.

---

## 8) Layering order (render pipeline)

Render from back to front:

1. Background (transparent or app background)
2. Breadboard body base fill (rounded rectangle)
3. Subtle body gradients + noise
4. Rail block base shading (slightly distinct panels)
5. Terminal block base shading
6. Center trench recess shading + seam
7. Rail stripes (red/blue lines)
8. Hole shadows (optional ambient occlusion pass)
9. Hole bevels and cavities (all holes)
10. Printed labels (letters, numbers, +/−)
11. Optional imperfections layer (very subtle specks/smudges)

**Rule:** Labels and stripes must sit visually “on top” of plastic, while holes appear cut “into” plastic.

---

## 9) Imperfections (subtle realism, not grime)

The reference has minor specks and slight discoloration.

- Add optional speck noise at low opacity.
- Add faint scuffs in the center trench.

Constraints:

- Imperfections must not impede usability or readability.
- Must remain subtle at typical zoom.

---

## 10) Accessibility and UX constraints (visual skin must not break interaction)

Even with photoreal shading:

- Hole centers must remain clear and clickable.
- Highlight/hover states must override base shading and remain legible.
- At high zoom, hole edges should remain crisp; avoid heavy blur.

---

## 11) Acceptance criteria (visual)

### 11.1 High-level match

- At a glance, the board reads as a physical off-white breadboard with:
  - two side power rails,
  - center trench,
  - 30×(5+5) terminal hole field,
  - printed row/column labels,
  - red/blue rail stripes and +/−.

### 11.2 Hole appearance

- Holes look like beveled cutouts with a dark interior.
- Lighting direction is consistent (upper-left highlights).

### 11.3 Rail gaps

- Each rail block clearly shows at least two interruption regions:
  - a small mid split,
  - a larger lower notch.

### 11.4 Text and print

- Labels are readable, not pure black.
- Stripes are saturated but not neon.
- Print is aligned precisely to the hole grid.

---

## 12) Open tunables (expected to iterate)

These values should be constants/config so we can visually tune:

- `pitchX`, `pitchY`
- `trenchWidth`
- `borderInset`
- `holeOuterSize`, `holeInnerSize`, corner radii
- `gapA`, `gapB` and their row placements
- palette colors and stripe thickness
- noise/speck intensity

---

## 13) Future enhancement: measured photo calibration

If we add the reference image to the repo, we can compute exact rail hole counts and gap placements by:

- detecting hole centers via image processing,
- fitting an affine transform to map pixel coordinates to grid rows/columns,
- reporting exact missing-hole rows.

This would let us tune `gapA/gapB` and placements to match the reference even more closely.
