---
name: virtual-pet-iteration
description: Build and iteratively improve a web-based virtual pet product for children aged 5-8 with strong habit-building loops, parent controls, and measurable learning outcomes. Use when tasks involve generating PRDs, refining feature scope, defining API/data schemas, planning experiments, or shipping incremental frontend/backend changes for the children virtual-pet project.
---

# Virtual Pet Iteration Skill

## Workflow

1. Clarify current phase: discovery, PRD drafting, data design, or feature implementation.
2. Pick only required deliverables for this turn (PRD, SQL schema, API spec, code, metrics plan).
3. Keep each iteration shippable: one closed user loop (trigger → action → reward).
4. Validate with concrete acceptance criteria and event tracking.
5. Append next-iteration backlog with no more than 5 items.

## Deliverable Rules

- Produce child-facing UX with low reading burden: icon + voice-first hints.
- Require parent configurability for every task/reward rule that impacts child time or difficulty.
- Define anti-abuse limits for any reward mechanism.
- Add telemetry events for every new feature.
- Prioritize PWA-safe, mobile-first interactions.

## Use References

- Use `references/prd-template.md` when asked for PRD structure.
- Use `references/metrics-events.md` when defining events/KPIs.

## Implementation Checklist

- Define user story and acceptance criteria.
- Map to database tables and API endpoints.
- Build thin vertical slice first; avoid broad unfinished modules.
- Add seed/mock data for immediate demo.
- Run basic local validation commands before commit.
