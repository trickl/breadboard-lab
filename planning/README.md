# Planning Documentation

This directory contains planning documents for the Breadboard Lab project.

## Key Documents

### [00-planning.md](./00-planning.md) — Rete.js Migration Planning Document

**Status:** Complete, Ready for Review  
**Version:** 1.0  
**Date:** January 2026  
**Length:** ~1,500 lines (~6,500 words)

Comprehensive planning document for migrating from PixiJS bespoke wiring system to Rete.js visual programming graph architecture.

**Contents:**

- Executive summary and unique selling proposition
- Current state analysis (pain points, what works well)
- Competitor analysis (Fritzing, CircuitJS, Wokwi)
- Licensing constraints (Fritzing graphics, MIT compatibility)
- Architectural rationale and technical decisions
- UI/UX requirements with acceptance criteria
- Technical architecture (hybrid Rete.js + PixiJS approach)
- Solver integration strategy
- Phased implementation roadmap (4 phases, ~7 weeks)
- Comprehensive testing strategy
- Risk assessment with mitigation plans
- Definition of done with 26+ checkboxes

**Key Decisions:**

1. Hybrid architecture: Rete.js for graph logic, PixiJS for rendering
2. Phased approach with proof-of-concept first
3. Core layer (circuit extraction/simulation) remains unchanged
4. Feature flags and abort criteria for risk mitigation

## Vision Documents

- [vision/goal.md](./vision/goal.md) — Target architecture specification (requires Rete.js)
- [vision/goal-010726.md](./vision/goal-010726.md) — Historical snapshot

## Issue Queue

### Processed

- [migrate-to-retejs-architecture.md](./issue_queue/processed/migrate-to-retejs-architecture.md) — Original issue description

### Complete

- See [issue_queue/complete/](./issue_queue/complete/) for completed features

## How to Use This Documentation

1. **For Contributors:** Read `00-planning.md` to understand the Rete.js migration architecture
2. **For Reviewers:** Use the Definition of Done section to validate implementation
3. **For Implementers:** Follow the phased roadmap in Section 11

## Document Conventions

- Planning documents are comprehensive (not brief summaries)
- Technical decisions are documented with rationale
- Risks are identified with mitigation strategies
- Acceptance criteria are testable and concrete
- References are provided for all external sources
