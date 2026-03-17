---
title: 'Prisma to @effect/sql-sqlite-bun Migration'
slug: 'prisma-to-effect-sql-migration'
created: '2026-03-17T18:43:13Z'
status: 'in-progress'
stepsCompleted: [1, 2]
tech_stack: ['@effect/sql-sqlite-bun', 'Effect Config', 'SQLite', 'Effect Schema.Struct', 'SqlModel.makeRepository', 'Migrator.fromFileSystem']
files_to_modify: ['packages/prisma/ (remove)', 'src/db/ (create new module)', 'src/hero/HeroAppService.ts (user will refactor)']
code_patterns: ['Effect.gen for async flows', 'Schema.Struct for type definitions', 'layerConfig for client setup', 'Manual SQL joins for relations']
test_patterns: ['NOT APPLICABLE']
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

### Effect SQL Capabilities (Critical Discovery)

**Effect SQL 4.0 provides ORM-like functionality out-of-the-box:**

1. **SqlModel.makeRepository** — Auto-generated CRUD:
   - `insert`, `insertVoid`
   - `update`, `updateVoid`
   - `findById`
   - `delete`
   - Type-safe via Schema.Struct

2. **Migrator System** — Built-in migration support:
   - `Migrator.fromFileSystem("src/db/migrations")`
   - `Migrator.fromGlob(...)` for file patterns
   - `Migrator.fromRecord(...)` for object-based
   - Automatic migrations table (`effect_sql_migrations`)
   - Transaction support
   - Locking mechanism

3. **SqliteClient.layerConfig** — Effect Config integration:
   - `Config.config("DATABASE_PATH")` support
   - Automatic WAL mode
   - Connection pooling

4. **SqlSchema Module** — Schema-to-SQL mapping:
   - `SqlSchema.findOne` for single-row queries
   - `SqlSchema.findAll` for multi-row
   - `SqlSchema.void` for no-return queries
   - Type-safe result transformation

**Implication:** No manual SQL for basic CRUD. Use Schema.Struct + makeRepository.

### Files to Reference

| File | Purpose | Action |
| ---- | ------- | ------ |
| `packages/prisma/index.ts` | Current query implementations | Reference for `getUserWithCookies`, `getUserListWithCookies`, `updateSignupUserCookies` |
| `packages/prisma/prisma/schema.prisma` | Schema structure (4 tables + 1 enum) | Replicate table structure in migrations |
| `packages/prisma/seed-db.ts` | Seed script pattern | NOT migrating (user will handle separately) |
| `packages/prisma/seed/cf-zone.seed.ts` | Example of Prisma transactions | Reference for transaction patterns |
| `src/hero/HeroAppService.ts` | Uses `TUserCookies` type | User will refactor after migration |
| `node_modules/.bun/@effect+sql-sqlite-bun/.../SqliteClient.ts` | Effect SQL client API | Use `layerConfig`, `make` for setup |
| `node_modules/.bun/effect/.../unstable/sql/Migrator.ts` | Migration system API | Use `fromFileSystem`, `run` |
| `node_modules/.bun/effect/.../unstable/sql/SqlModel.ts` | Repository generator API | Use `makeRepository` for CRUD |
| `.claude/skills/typescript-advanced-types/SKILL.md` | For complex type logic | Use if advanced Schema patterns needed |
| `_bmad-output/project-context.md` | Project rules and patterns | Follow all Effect, TypeScript, and style rules |

### Technical Decisions

1. **Database Client Location**: `src/db/` module (following domain folder pattern)
2. **Configuration**: Effect Config for `DATABASE_PATH` from ENV using `layerConfig`
3. **Client Setup**: Pragmatic `layerConfig` (NOT Service pattern, use Layer)
4. **Error Handling**: Effect's built-in error handling + domain errors
5. **Transactions**: Required for `updateSignupUserCookies` (multi-step operations)
6. **Type System**: Schema.Struct-based typing (NO Prisma codegen)
7. **Migrations**: File-based using `Migrator.fromFileSystem("src/db/migrations")`
8. **CRUD Strategy**: Use `makeRepository` for simple CRUD, manual SQL for complex queries
9. **Relations**: Manual joins (Effect SQL has no Prisma-like `include` feature yet)

### Revised Architecture

**Comparison with Prisma:**
| Feature | Prisma | Effect SQL |
|---------|--------|-----------|
| CRUD operations | ✅ Auto-generated | ✅ makeRepository |
| Type safety | ✅ Codegen | ✅ Schema.Struct |
| Migrations | ✅ CLI-based | ✅ File-based Effects |
| Relations | ✅ `include` | ❌ Manual joins |
| Client setup | ✅ Simple | ✅ layerConfig |
| Transactions | ✅ `$transaction` | ✅ withTransaction |

**Key Differences:**
- Prisma = Generated code (CLI, codebase files)
- Effect SQL = Runtime construction (Schema-based, no codegen)

---

### **Files to Create**

**New Module: `src/db/`**

```
src/db/
├── migrations/
│   ├── 001_initial_schema.ts      # CREATE TABLE for all 4 tables
│   └── 002_add_indexes.ts          # CREATE INDEX if needed
├── schema.ts                        # Schema.Struct definitions
├── repos.ts                         # Repository generators + custom queries
├── client.ts                        # layerConfig setup
└── index.ts                         # Exports
```

**File Details:**
- **`migrations/001_initial_schema.ts`**: Effects creating `zones`, `email_rules`, `users`, `user_cookies` tables
- **`migrations/002_add_indexes.ts`**: Performance indexes
- **`schema.ts`**: `UserSchema`, `UserCookieSchema`, `ZoneSchema`, `EmailRuleSchema`, `SameSiteSchema`
- **`repos.ts`**: `makeUserRepo`, `makeUserCookieRepo`, custom queries like `getUserWithCookies`
- **`client.ts`**: `SqliteClient.layerConfig(Config.config("DATABASE_PATH"))`
- **`index.ts`**: Export schemas, repos, client layer

**Files to Remove:**
- `packages/prisma/` (entire directory)

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
