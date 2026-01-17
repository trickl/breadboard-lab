# Resistor Rendering Spec (Axial 1/4W) — Breadboard Lab

This document records the **canonical rendering and band-computation rules** for an axial leaded resistor in Breadboard Lab.

It is based on the project’s target look: **a typical ¼W axial metal-film resistor** with:

- tan/beige lacquered cylindrical body
- glossy printed color bands
- tinned copper leads
- slight imperfections (subtle variation, not “perfect CGI”)

The goal is repeatable, visually authentic placement of bands and correct IEC 60062 encoding from a resistance value.

---

## 1) Scope & output

The renderer must:

- compute band colors from a resistance value (IEC 60062)
- support **4-band** and **5-band** (optionally 6-band) coding
- place bands deterministically (same input → same band positions)
- render bands with slightly glossier appearance than the body

Note: the current implementation uses **2D SVG with procedural shading** to approximate the 3D/PBR intent.

---

## 2) Canonical geometry (¼W body)

Coordinate system for the *conceptual* model:

- body center at origin
- +X along the body length
- body is rotationally symmetric around X

Default dimensions:

- body length: $L_b = 6.3\,\mathrm{mm}$
- body diameter: $D_b = 2.3\,\mathrm{mm}$
- body radius: $R_b = 1.15\,\mathrm{mm}$

Other useful physical reference:

- breadboard hole pitch is **2.74mm** (project-specific).

---

## 3) Band code computation (IEC 60062)

### 3.1 Digit color mapping (0–9)

| Digit | Color | Approx sRGB |
|---:|---|---|
| 0 | Black | (20, 20, 20) |
| 1 | Brown | (92, 51, 23) |
| 2 | Red | (176, 25, 25) |
| 3 | Orange | (220, 120, 20) |
| 4 | Yellow | (230, 200, 20) |
| 5 | Green | (30, 120, 55) |
| 6 | Blue | (45, 75, 170) |
| 7 | Violet | (120, 60, 140) |
| 8 | Grey | (130, 130, 130) |
| 9 | White | (235, 235, 235) |

### 3.2 Multiplier colors

Multiplier exponent $m$ corresponds to $10^m$.

- $m = -2$ → Silver
- $m = -1$ → Gold
- $m = 0$ → Black
- $m = 1$ → Brown
- …
- $m = 9$ → White

### 3.3 Tolerance colors (common)

- ±1% Brown
- ±2% Red
- ±5% Gold
- ±10% Silver

(Other tolerances may be added later.)

### 3.4 Choosing 4 vs 5 bands

Breadboard Lab chooses band count as:

- if tolerance is known and $\le 2\%$ → **5-band** (3 digits + multiplier + tolerance)
- otherwise → **4-band** (2 digits + multiplier + tolerance)

If tolerance is unknown, default to **±5% (gold)** and **4-band**.

### 3.5 Resistance → digits + multiplier exponent

Given resistance $R$ (ohms) and significant digits $n$:

1. $e = \lfloor \log_{10}(R) \rfloor$
2. $$\text{scaled} = \mathrm{round}\left(\frac{R}{10^{e-(n-1)}}\right)$$
3. If scaled overflows (equals $10^n$), set:
   - $\text{scaled} = 10^{n-1}$
   - $e = e + 1$
4. Extract digits from `scaled` (2 digits for 4-band, 3 digits for 5-band).
5. Multiplier exponent:
   $$m = e - (n-1)$$

Bands:

- 4-band: `[d1, d2, m, tolerance]`
- 5-band: `[d1, d2, d3, m, tolerance]`

---

## 4) Band placement

### 4.1 Reading direction

Left → right is +X.

Tolerance band is the **right-most** band and is separated by a slightly larger gap.

### 4.2 End margins

Reserve margins at both ends:

- $M_e = 0.12 \cdot L_b$

Bands lie within:

$$x \in \left[-\frac{L_b}{2}+M_e,\; +\frac{L_b}{2}-M_e\right]$$

**Hard constraint:** no band **edge** may enter the end margins.
In other words, for each band with center $x_i$ and width $W$:

$$x_i - \frac{W}{2} \ge -\frac{L_b}{2} + M_e$$
$$x_i + \frac{W}{2} \le +\frac{L_b}{2} - M_e$$

### 4.3 Widths and gaps

- band width: $W = 0.085 \cdot L_b$
- standard gap: $G = 0.050 \cdot L_b$
- gap before tolerance: $G_t = 0.090 \cdot L_b$

### 4.4 Band centers along X

Let:

- $x_0 = -\frac{L_b}{2} + M_e$

Then:

- $x_1 = x_0 + \frac{W}{2}$
- subsequent bands are spaced by $W+G$, except the tolerance band which uses $W+G_t$ from the previous.

4-band:

- $x_2 = x_1 + (W+G)$
- $x_3 = x_2 + (W+G)$
- $x_4 = x_3 + (W+G_t)$

5-band:

- $x_2 = x_1 + (W+G)$
- $x_3 = x_2 + (W+G)$
- $x_4 = x_3 + (W+G)$
- $x_5 = x_4 + (W+G_t)$

### 4.5 Deterministic “imperfections” (optional)

To avoid sterile results, allow a small deterministic jitter seeded by resistance:

- center jitter: ±0.03mm
- width jitter: ±3%

This should be subtle and stable.

When jitter is enabled, it must **not** violate the hard end-margin constraint above. If jitter would push a band into an end-exclusion zone, clamp/shift to keep all band edges within the valid region.

---

## 6) Tolerance configuration

Tolerance is a first-class, per-resistor property (percent).

- Default: **±5%** (gold, 4-band)
- If tolerance is set and $\le 2\%$, use **5-band** encoding (3 digits + multiplier + tolerance).
- If tolerance is missing, fall back to library metadata if available, otherwise the default.

---

## 5) Implementation mapping to SVG

The current resistor is rendered as an SVG image (with fixed viewBox) aligned between two breadboard holes.

Band placement is computed in **mm space using the formulas above**, then mapped into the resistor SVG’s local X coordinate system:

- define the body’s left/right X extents in viewBox units: `(bodyLeftX, bodyRightX)`
- map $L_b$ mm → `(bodyRightX-bodyLeftX)` viewBox units, and place band centers relative to the body center.

This keeps the visual rhythm stable if the SVG gets slightly re-shaped, as long as `bodyLeftX/bodyRightX` are updated.
