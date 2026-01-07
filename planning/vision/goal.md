# Breadboard Educational Tool  
## Next Iteration Specification (Rete.js Migration)

---

## 1. Purpose of This Iteration

This iteration focuses on a **foundational architectural shift** and a set of **core UX and simulation capabilities** that unlock the tool’s educational value.

The primary goals are:

1. Replace the current **PixiJS/WebGL bespoke wiring system** with a **Rete.js–based visual programming graph**.
2. Model **physical breadboard interaction realistically**, while enabling **capabilities impossible in physical hardware** (e.g. animated current flow, hidden connectivity, live voltage/current inspection).
3. Improve **first-time user experience** so the tool is immediately understandable and usable.
4. Establish a clean separation between:
   - *Physical placement*
   - *Electrical behaviour*
   - *Logical circuit representation*

This iteration prioritises **correct interaction primitives and mental models**, not breadth of components.

---

## 2. Architectural Change: PixiJS → Rete.js

### 2.1 Rationale

The existing PixiJS implementation makes **connector management, snapping, routing, and interaction state** increasingly complex and fragile.

Rete.js provides:

- Native **node–connector–edge abstractions**
- Built-in **connection constraints**
- Support for **re-routing**, **animated edges**, and **custom socket logic**
- A clean conceptual mapping to **electrical networks**

Rete.js will act as the **interaction and connectivity backbone**, not merely a diagramming layer.

---

## 3. Core Conceptual Model

### 3.1 Nodes

All meaningful physical and electrical entities are represented as **Rete nodes**, including:

- Components (LEDs, resistors, transistors, switches, batteries)
- Breadboard holes (conceptually, even if visually grouped)
- Wires (either edges or thin intermediary nodes)

### 3.2 Connectors (Sockets)

- **Component legs** are fixed connectors attached to a component body.
- **Breadboard holes** act as exclusive connection points.
- A **one-connector-per-hole constraint** must be enforced.

A valid connection represents **electrical continuity**.

---

## 4. Views and Modes Overview

The application has **two primary views** and **two orthogonal informational modes**.

### 4.1 Primary Views

1. **Physical View**
   - Realistic breadboard and components
   - Spatial placement and manipulation
   - Primary construction interface

2. **Logical View**
   - Abstracted circuit representation
   - Auto-laid-out schematic-style graph
   - Educational and debugging aid

### 4.2 Informational Modes (UI Toggles)

These modes overlay additional information on top of either view:

1. **Electrical View Mode**
2. **X-Ray Mode**

They are independent toggles and may be enabled or disabled separately.

---

## 5. Physical View (formerly “Breadboard View”)

### 5.1 Purpose

The Physical View represents **what a user would physically build** on a real breadboard, with enhanced clarity and feedback.

---

### 5.2 Breadboard Model

- Breadboard holes are rendered in a realistic grid.
- Electrically shared rows and rails are modeled internally.
- By default, **internal connectivity is hidden**.

This is intentional: hidden structure is revealed explicitly via X-Ray Mode.

---

### 5.3 Component Placement Model

#### 5.3.1 Component Instantiation

- Selecting a component does **not** immediately place it on the breadboard.
- The component appears **adjacent to the board**, floating beside it.
- The user:
  1. Drags the component body into position
  2. Connects individual legs to breadboard holes

This avoids visual occlusion and improves comprehension in dense circuits.

---

#### 5.3.2 Component Geometry

- Components must be **visually realistic**:
  - LEDs with lens and legs
  - Resistors with cylindrical bodies and leads
  - Transistors with appropriate package shapes

- Legs are:
  - Fixed relative to the component body
  - Represented as Rete connectors
  - Positioned at realistic angles (e.g. 120° separation for TO-92 transistors)

---

### 5.4 Snapping and Constraints

- Legs **magnetically snap** to free breadboard holes.
- A hole may only accept **one connector**.
- Invalid connections should:
  - Be visually rejected
  - Provide subtle feedback (e.g. highlight or glow)

---

## 6. Wires

### 6.1 Wire Representation

Two acceptable implementations (engineering choice):

1. **Edge-based**
   - Wire = Rete connection between two breadboard holes
2. **Node-based**
   - Wire = thin node with two connectors

The architecture must not assume one approach exclusively.

---

### 6.2 Wire Interaction

- Wires are draggable via control points.
- Re-routing must be supported (Rete re-root pattern):
  - Dragging a segment recalculates the path
  - Routing avoids component overlap where possible

- Wire colour is user-selectable (default set includes red, black, yellow).

---

### 6.3 Visual Clarity

Wire rendering should:

- Minimise overlap
- Prefer orthogonal or gently curved paths
- Remain legible at moderate zoom levels

---

## 7. Selection, Rotation, and Deletion

### 7.1 Selection Model

- Clicking a component body selects it.
- Selection enables:
  - Rotation
  - Deletion
  - Highlighting of connected wires and holes

---

### 7.2 Rotation

- All components support **continuous rotation** (not limited to 90°).
- When selected:
  - A rotation handle or arc is shown
  - Dragging rotates the component

Rotation affects:
- Visual orientation
- Connector positions
- Snapping geometry

---

### 7.3 Deletion

- Selected components can be deleted via:
  - On-screen control
  - Keyboard delete/backspace

Deletion must remove:
- Associated connectors
- Associated wires
- Electrical graph references

---

## 8. Switches and User Interaction

### 8.1 Switch Components

Switches are **stateful, interactive components**.

Primary challenge: left-click is already used for dragging.

#### Interaction Model

- Short click (below movement threshold): toggles switch state
- Click-and-drag: moves the switch
- Optional future enhancement: dedicated toggle hotspot

State changes must propagate immediately through the electrical simulation.

---

## 9. Electrical View Mode (UI Toggle)

### 9.1 Purpose

Electrical View Mode exposes **dynamic electrical behaviour** that cannot be observed physically.

---

### 9.2 Animated Current Flow

When enabled:

- Animated connectors show **where current is flowing**
- Animations appear **only on active paths**
- Flow direction and speed reflect current magnitude

This applies to:
- Wires
- Component legs
- Internal breadboard connections

---

### 9.3 Voltage and Current Inspection

Electrical View Mode also enables:

- Display of expected **voltage and current**:
  - On wires
  - Across component legs
  - Within breadboard rows and rails

- Values should be visible via:
  - Hover
  - Click
  - Inline annotations (implementation choice)

This explicitly supports multimeter-style learning.

---

## 10. X-Ray Mode (UI Toggle)

### 10.1 Purpose

X-Ray Mode reveals the **hidden internal wiring of the breadboard**.

This explains *why* certain holes are electrically connected.

---

### 10.2 Behaviour

When enabled:

- Internal breadboard buses and rails become visible
- Electrically shared holes are visually grouped or linked
- Overlaid wiring is clearly distinguishable from user-added wires

X-Ray Mode is informational only:
- It does not alter connectivity
- It does not affect simulation state

---

## 11. LEDs and Visual Electrical Feedback

### 11.1 LED Behaviour

LEDs are not binary indicators.

They must:
- Respond to voltage and current levels
- Respect polarity and forward voltage
- Display proportional brightness

---

### 11.2 Visual Representation

- Brightness represented via:
  - Emissive intensity
  - Optional glow/bloom effect
- Over-voltage or invalid conditions may:
  - Dim
  - Flicker
  - Be visually distinguishable (future extension)

---

## 12. Quick Select Component Bar

### 12.1 Purpose

The tool must be usable **within seconds**.

---

### 12.2 Default Quick Select Items

Displayed prominently on initial load:

- LED
- Wire (red)
- Resistor
- Switch
- Battery / power source

---

### 12.3 Customisation

- Users can:
  - Favourite components from the library
  - Remove items from quick select
- Quick select reflects favourites dynamically

---

## 13. Initial State: Not an Empty Board

On first load, users must see:

- A **working example circuit**
- At least one interactive element (e.g. switch + LED)

This immediately communicates:
- Purpose
- Interaction model
- Educational value

---

## 14. Logical View (formerly “Schematic View”)

### 14.1 Purpose

The Logical View presents a **canonical, abstracted circuit diagram**, independent of physical layout.

---

### 14.2 Behaviour

- Generated automatically from the physical/electrical graph
- Uses layout algorithms to:
  - Remove spatial noise
  - Present standard electrical symbols
- Maintains a one-to-one mapping with circuit topology

This view supports:
- Conceptual understanding
- Debugging
- Teaching abstraction

---

## 15. Summary

This iteration establishes:

- A **robust interaction foundation** via Rete.js
- A clear distinction between:
  - Physical construction
  - Electrical behaviour
  - Logical representation
- Two powerful informational modes that provide value beyond physical hardware

Future iterations can extend simulation depth and component variety without revisiting core assumptions.
