# Materials Action Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add action materials directly into `/materials` with create/view/edit support and enforce that action description or reference video is required.

**Architecture:** Keep `materials` and `movement_materials` as separate back-end sources. Extend the `/materials` UI with an action mode that renders movement records and uses the existing movement APIs, while moving action validation into a shared movement-material validator reused by both API routes and the form UI.

**Tech Stack:** Next.js App Router, React, Vitest, Zod, Prisma

---

### Task 1: Movement Validation

**Files:**
- Create: `domains/movement-material/validators.ts`
- Create: `domains/movement-material/validators.test.ts`
- Modify: `app/api/movements/route.ts`
- Modify: `app/api/movements/[id]/route.ts`
- Modify: `app/api/movement-materials/route.ts`

- [ ] Write failing tests for create/update validation.
- [ ] Run targeted Vitest command and confirm failure.
- [ ] Implement shared movement validator with "content or url required".
- [ ] Reuse validator in movement APIs.
- [ ] Re-run targeted tests and confirm pass.

### Task 2: Movement Form Behavior

**Files:**
- Create: `components/movement/MovementForm.test.tsx`
- Modify: `components/movement/MovementForm.tsx`

- [ ] Write failing form tests for text-only submit, video-only submit, and both-empty blocked state.
- [ ] Run targeted Vitest command and confirm failure.
- [ ] Implement UI validation and submission shaping.
- [ ] Re-run targeted tests and confirm pass.

### Task 3: Materials Page Action Integration

**Files:**
- Modify: `app/(app)/materials/page.tsx`
- Modify: `components/movement/MovementCard.tsx`

- [ ] Extend `/materials` state and filter model with an action tab backed by movement data.
- [ ] Add action list rendering, action detail modal, and action create/edit modal on the materials page.
- [ ] Keep existing material upload flow for non-action filters and movement form flow for action filter.
- [ ] Run relevant tests plus a production sanity check (`vitest` targets and `next build` if feasible).
