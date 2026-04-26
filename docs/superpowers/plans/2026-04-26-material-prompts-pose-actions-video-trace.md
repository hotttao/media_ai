# Material Prompts Pose Actions Video Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prompt fields to core materials, constrain actions by pose with explicit general/special action labeling, and persist full generation trace IDs on videos.

**Architecture:** Extend existing tables instead of introducing separate trace/rule subsystems. `materials` gets a `prompt`, `movement_materials` stays separate but gains general/special action semantics plus a pose mapping join table, and `videos` stores the generation chain IDs directly so lookup stays simple.

**Tech Stack:** Next.js App Router, Prisma, React, Zod, Vitest

---

### Task 1: Prompt Field Data Model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_material_prompt_pose_action_mappings_and_video_trace/migration.sql`
- Modify: `domains/materials/types.ts`
- Modify: `domains/materials/validators.ts`
- Modify: `domains/materials/service.ts`

- [ ] Add `prompt` to the `Material` Prisma model and related TypeScript types.
- [ ] Extend material create/update validators to accept `prompt`.
- [ ] Update material service create/update flows to persist `prompt`.

### Task 2: Movement Mapping Model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/<timestamp>_add_material_prompt_pose_action_mappings_and_video_trace/migration.sql`
- Modify: `domains/movement-material/types.ts`
- Modify: `domains/movement-material/validators.ts`
- Modify: `domains/movement-material/service.ts`

- [ ] Add `isGeneral` to `movement_materials` and create a join table between `materials(type=POSE)` and `movement_materials`.
- [ ] Extend movement validators/types to support `isGeneral` and pose IDs.
- [ ] Add service helpers to list movements with mapped pose IDs and to query movements allowed for a pose.

### Task 3: API Surface

**Files:**
- Modify: `app/api/materials/route.ts`
- Modify: `app/api/materials/[id]/route.ts`
- Modify: `app/api/movements/route.ts`
- Modify: `app/api/movements/[id]/route.ts`
- Create or Modify: `app/api/poses/[id]/movements/route.ts` or equivalent route under existing API conventions

- [ ] Expose `prompt` through material APIs.
- [ ] Expose movement `isGeneral` and pose mappings through movement APIs.
- [ ] Add an API to fetch allowed movements for a given pose or include pose mappings in existing movement payloads.

### Task 4: Materials UI

**Files:**
- Modify: `components/material/MaterialUploader.tsx`
- Modify: `app/(app)/materials/page.tsx`
- Modify: `components/movement/MovementForm.tsx`
- Modify: `components/movement/MovementCard.tsx`

- [ ] Add prompt input/editing for non-action core materials.
- [ ] Extend action creation/editing UI with general/special labeling and pose association editing.
- [ ] Show clear labels for general vs special actions in the materials page.

### Task 5: Video Trace Model and Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/<timestamp>_add_material_prompt_pose_action_mappings_and_video_trace/migration.sql`
- Modify: `domains/video-generation/service.ts`
- Modify: `app/api/products/[id]/generate-video/route.ts`
- Modify: `domains/api/response-validators.ts`

- [ ] Add trace ID columns to `videos` for scene, pose, movement, first frame, style image, and model image.
- [ ] Update video generation service and API route signatures so the selected IDs are carried into final video persistence.
- [ ] Update API response schemas if they surface these fields.

### Task 6: Generation UI Filtering

**Files:**
- Modify: `app/(app)/products/[id]/GenerateVideoWizard.tsx`

- [ ] Filter selectable movements by the selected pose: show all general actions plus pose-specific actions.
- [ ] Label actions in the picker as general or special.
- [ ] Ensure final video generation request submits the full trace ID set.

### Task 7: Tests and Verification

**Files:**
- Create: `domains/movement-material/service.test.ts` or targeted validator/service tests
- Modify: `components/movement/MovementForm.test.tsx`
- Create or Modify: targeted tests around material validators or route payload shaping

- [ ] Add failing tests first for prompt validation, movement mapping behavior, and movement filtering rules.
- [ ] Add/extend tests for action UI labels and submission payload shape where practical.
- [ ] Run targeted Vitest suites.
- [ ] Run `./node_modules/.bin/next.cmd build` after implementation.
