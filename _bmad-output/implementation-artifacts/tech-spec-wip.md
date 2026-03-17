---
title: 'Prisma to @effect/sql-sqlite-bun Migration'
slug: 'prisma-to-effect-sql-migration'
created: '2026-03-17T18:43:13Z'
status: 'in-progress'
stepsCompleted: [1]
tech_stack: ['@effect/sql-sqlite-bun', 'Effect Config', 'SQLite']
files_to_modify: []
code_patterns: []
test_patterns: []
---

# Tech-Spec: Prisma to @effect/sql-sqlite-bun Migration

**Created:** 2026-03-17T18:43:13Z

## Overview

### Problem Statement

Remove Prisma ORM dependency and migrate to Effect's native `@effect/sql-sqlite-bun` client. Current workspace package `@scraper/prisma` needs to be eliminated as part of monorepo → flat structure refactoring.

### Solution

Create `src/db/` directory with Effect SQL SQLite client using Effect Config for ENV-based database path. Reimplement all queries (`getUserWithCookies`, `getUserListWithCookies`, `updateSignupUserCookies`) with transaction support and strict typing.

### Scope

**In Scope:**
- Create `src/db/` module with:
  - Effect SQL client setup with `SqliteClient`
  - Effect Config for `DATABASE_PATH` from ENV
  - Schema definition (4 tables + 1 enum, same structure)
  - Query reimplementations with Effect error handling
  - Transaction support for multi-step operations
  - Type exports (`TUserCookies`, etc.)
- Remove `packages/prisma/` directory

**Out of Scope:**
- Updating `src/hero/HeroAppService.ts` (user will refactor separately)
- Updating `package.json` (user will handle dependencies)
- Data migration from existing `dev.db` (clean slate)
- Schema structure changes (keep same tables/relationships)
- Additional database implementations (SQLite only)
- Prisma Studio replacement

## Context for Development

### Codebase Patterns

**Effect Usage (Pragmatic):**
- Use `Effect.gen` for complex async flows
- `Schema.TaggedErrorClass` for domain errors
- NOT blanket `Effect.Service()` pattern (use sparingly)
- Small operations → bare `Effect.tryPromise` is fine

**Type Safety:**
- `unknown` over `any`
- Type guards over type assertions
- Discriminated unions for state/errors

**Project-Specific:**
- Relative imports with `.ts` extension required (Bun)
- `preserveSymlinks: false` is non-negotiable
- LSP tools mandatory for code navigation

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/prisma/index.ts` | Current query implementations to reimplement |
| `packages/prisma/prisma/schema.prisma` | Schema structure (4 tables + 1 enum) |
| `.claude/skills/typescript-advanced-types/SKILL.md` | For complex type logic if needed |

### Technical Decisions

1. **Database Client Location**: `src/db/` module (following domain folder pattern)
2. **Configuration**: Effect Config for `DATABASE_PATH` from ENV
3. **Client Setup**: Simple `SqliteClient` without Service pattern (pragmatic approach)
4. **Error Handling**: Effect's built-in error handling with domain errors
5. **Transactions**: Required for `updateSignupUserCookies` (multi-step operations)
6. **Type System**: Schema-based typing from Effect SQL (similar to Prisma-generated types)

## Implementation Plan

### Tasks

_PENDING: Generated in Step 2 (Deep Investigation)_

### Acceptance Criteria

_PENDING: Generated in Step 3 (Generate Spec)_

## Additional Context

### Dependencies

- `@effect/sql` package (user will install via package.json)
- Existing Effect ecosystem in project

### Testing Strategy

**NOT APPLICABLE** — Tests not part of current project workflow.

### Notes

- Existing `dev.db` has been backed up by user
- Clean slate approach — no data migration needed
- User will handle `package.json` dependency updates
- User will refactor `HeroAppService.ts` separately after migration
