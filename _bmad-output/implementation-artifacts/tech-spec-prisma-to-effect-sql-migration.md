---
title: 'Prisma to @effect/sql-sqlite-bun Migration'
slug: 'prisma-to-effect-sql-migration'
created: '2026-03-17T18:43:13Z'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
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

#### Task 1: Create Database Module Structure
- File: `src/db/` (new directory)
- Action: Create directory structure for database module
- Notes:
  ```
  src/db/
  ├── migrations/
  ├── schema.ts
  ├── repos.ts
  ├── client.ts
  └── index.ts
  ```

#### Task 2: Define Database Schemas
- File: `src/db/schema.ts` (new file)
- Action: Create Schema.Struct definitions for all tables
- Implementation details:
  ```typescript
  import { Schema } from "effect"

  export const SameSiteSchema = Schema.Literal("Strict", "Lax", "None")
  export type TSameSite = Schema.Schema.Type<typeof SameSiteSchema>

  export const ZoneSchema = Schema.Struct({
    zoneId: Schema.String,
    domain: Schema.String
  })
  export type TZone = Schema.Schema.Type<typeof ZoneSchema>

  export const EmailRuleSchema = Schema.Struct({
    id: Schema.String,
    email: Schema.String,
    forwardTo: Schema.String,
    zoneId: Schema.String
  })
  export type TEmailRule = Schema.Schema.Type<typeof EmailRuleSchema>

  export const UserSchema = Schema.Struct({
    username: Schema.String,
    password: Schema.String,
    hasAccount: Schema.Boolean,
    hasConfigured: Schema.Boolean,
    emailVerified: Schema.Boolean,
    tfaSecret: Schema.NullOr(Schema.String)
  })
  export type TUser = Schema.Schema.Type<typeof UserSchema>

  export const UserCookieSchema = Schema.Struct({
    name: Schema.String,
    value: Schema.String,
    domain: Schema.String,
    path: Schema.String,
    expires: Schema.DateTimeFromUtc.or(Schema.Null),
    httpOnly: Schema.Boolean,
    secure: Schema.Boolean,
    sameParty: Schema.Boolean,
    sameSite: SameSiteSchema
  })
  export type TUserCookie = Schema.Schema.Type<typeof UserCookieSchema>

  export type TUserCookies = ReadonlyArray<TUserCookie>
  ```

#### Task 3: Create Initial Schema Migration
- File: `src/db/migrations/001_initial_schema.ts` (new file)
- Action: Create migration that defines all 4 tables with proper foreign keys
- Implementation details:
  ```typescript
  import { SqlClient } from "effect/unstable/sql/SqlClient"
  import { Effect } from "effect/Effect"

  export default Effect.gen(function* () {
    const sql = yield* SqlClient

    // Create zones table
    yield* sql`
      CREATE TABLE IF NOT EXISTS zones (
        zone_id TEXT PRIMARY KEY NOT NULL,
        domain TEXT UNIQUE NOT NULL
      )
    `

    // Create email_rules table
    yield* sql`
      CREATE TABLE IF NOT EXISTS email_rules (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT UNIQUE NOT NULL,
        forward_to TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        user_username TEXT,
        FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE CASCADE
      )
    `

    // Create users table
    yield* sql`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY NOT NULL,
        password TEXT NOT NULL,
        has_account INTEGER DEFAULT 0 NOT NULL,
        has_configured INTEGER DEFAULT 0 NOT NULL,
        email_verified INTEGER DEFAULT 0 NOT NULL,
        tfa_secret TEXT,
        email TEXT,
        FOREIGN KEY (email) REFERENCES email_rules(id) ON DELETE CASCADE
      )
    `

    // Create user_cookies table with composite key
    yield* sql`
      CREATE TABLE IF NOT EXISTS user_cookies (
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        domain TEXT DEFAULT 'freebitco.in' NOT NULL,
        path TEXT DEFAULT '/' NOT NULL,
        expires TEXT,
        http_only INTEGER DEFAULT 0 NOT NULL,
        secure INTEGER DEFAULT 0 NOT NULL,
        same_party INTEGER DEFAULT 0 NOT NULL,
        same_site TEXT DEFAULT 'None' NOT NULL,
        user_username TEXT NOT NULL,
        PRIMARY KEY (name, domain, user_username),
        FOREIGN KEY (user_username) REFERENCES users(username) ON DELETE CASCADE
      )
    `
  })
  ```
- Notes: Uses `Effect.gen` for sequencing, proper foreign key CASCADE, matches Prisma schema structure

#### Task 4: Create Client Layer with Config
- File: `src/db/client.ts` (new file)
- Action: Create Effect Config integration and SqliteClient layer
- Implementation details:
  ```typescript
  import { SqliteClient } from "@effect/sql-sqlite-bun"
  import { Config } from "effect/Config"
  import { Layer } from "effect"

  // Config with default path
  const databasePathConfig = Config.string("DATABASE_PATH").pipe(
    Config.withDefault("dev.db")
  )

  // Client layer
  export const DatabaseLayer = SqliteClient.layerConfig(
    Config.config("DATABASE_PATH").pipe(
      Config.map((path) => ({ filename: path }))
    )
  )
  ```
- Notes: Uses `layerConfig` for Effect Config integration, provides `SqlClient` and `SqliteClient` services

#### Task 5: Create Repository Generators
- File: `src/db/repos.ts` (new file)
- Action: Create `makeRepository` functions for each table using `SqlModel.makeRepository`
- Implementation details:
  ```typescript
  import { SqlClient } from "effect/unstable/sql/SqlClient"
  import { SqlModel } from "effect/unstable/sql/SqlModel"
  import { Effect } from "effect/Effect"
  import * as Schema from "effect/Schema"
  import { ZoneSchema, EmailRuleSchema, UserSchema, UserCookieSchema, SameSiteSchema } from "./schema.ts"

  // Zone repository
  export const makeZoneRepo = SqlModel.makeRepository(ZoneSchema, {
    tableName: "zones",
    spanPrefix: "Zone",
    idColumn: "zoneId"
  })

  // EmailRule repository
  export const makeEmailRuleRepo = SqlModel.makeRepository(EmailRuleSchema, {
    tableName: "email_rules",
    spanPrefix: "EmailRule",
    idColumn: "id"
  })

  // User repository
  export const makeUserRepo = SqlModel.makeRepository(UserSchema, {
    tableName: "users",
    spanPrefix: "User",
    idColumn: "username"
  })

  // UserCookie repository
  export const makeUserCookieRepo = SqlModel.makeRepository(UserCookieSchema, {
    tableName: "user_cookies",
    spanPrefix: "UserCookie",
    idColumn: "name" // Note: composite key, this may need custom handling
  })
  ```
- Notes: Auto-generates insert, update, findById, delete operations. UserCookie has composite key - may need special handling.

#### Task 6: Implement Custom Queries
- File: `src/db/repos.ts` (extend existing file)
- Action: Implement complex queries that require joins or aggregations
- Implementation details:
  ```typescript
  // getUserWithCookies - user with related cookies
  export const getUserWithCookies = (username: string) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient

      const [user] = yield* sql<{username: string, cookies: string}>`
        SELECT
          json_object(
            'username', u.username,
            'password', u.password,
            'has_account', u.has_account,
            'has_configured', u.has_configured,
            'email_verified', u.email_verified,
            'tfa_secret', u.tfa_secret,
            'cookies', (
              SELECT json_group_array(json_object(
                'name', uc.name,
                'value', uc.value,
                'domain', uc.domain,
                'path', uc.path,
                'expires', uc.expires,
                'http_only', uc.http_only,
                'secure', uc.secure,
                'same_party', uc.same_party,
                'same_site', uc.same_site
              ))
              FROM user_cookies uc
              WHERE uc.user_username = u.username
            )
          )
        FROM users u
        WHERE u.username = ${username}
      `.withoutTransform

      return user
    })

  // getUserListWithCookies - list users without accounts with cookies
  export const getUserListWithCookies = (limit = 50) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient

      const users = yield* sql`
        SELECT
          json_object(
            'username', u.username,
            'password', u.password,
            'has_account', u.has_account,
            'cookies', (
              SELECT json_group_array(json_object(
                'name', uc.name,
                'value', uc.value,
                'domain', uc.domain,
                'path', uc.path,
                'expires', uc.expires,
                'http_only', uc.http_only,
                'secure', uc.secure,
                'same_party', uc.same_party,
                'same_site', uc.same_site
              ))
              FROM user_cookies uc
              WHERE uc.user_username = u.username
            )
          )
        FROM users u
        WHERE u.has_account = 0
        LIMIT ${limit}
      `.withoutTransform

      return users
    })

  // updateSignupUserCookies - transaction-based update
  export const updateSignupUserCookies = (username: string, cookies: TUserCookies) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient

      yield* sql.withTransaction(function* (tx) {
        // Update user has_account flag
        yield* tx`UPDATE users SET has_account = 1 WHERE username = ${username}`

        // Upsert each cookie
        for (const cookie of cookies) {
          yield* tx`
            INSERT INTO user_cookies (
              name, value, domain, path, expires,
              http_only, secure, same_party, same_site, user_username
            )
            VALUES (
              ${cookie.name}, ${cookie.value}, ${cookie.domain}, ${cookie.path},
              ${cookie.expires}, ${cookie.httpOnly}, ${cookie.secure},
              ${cookie.sameParty}, ${cookie.sameSite}, ${username}
            )
            ON CONFLICT (name, domain, user_username)
            DO UPDATE SET
              value = excluded.value,
              domain = excluded.domain,
              path = excluded.path,
              expires = excluded.expires,
              http_only = excluded.http_only,
              secure = excluded.secure,
              same_party = excluded.same_party,
              same_site = excluded.same_site
          `
        }
      })
    })
  ```
- Notes: Uses manual SQL joins with JSON aggregation, transaction for multi-step operations, `ON CONFLICT DO UPDATE` for upsert

#### Task 7: Create Indexes Migration
- File: `src/db/migrations/002_add_indexes.ts` (new file)
- Action: Create performance indexes for common queries
- Implementation details:
  ```typescript
  import { SqlClient } from "effect/unstable/sql/SqlClient"
  import { Effect } from "effect/Effect"

  export default Effect.gen(function* () {
    const sql = yield* SqlClient

    yield* sql`CREATE INDEX IF NOT EXISTS idx_users_has_account ON users(has_account)`
    yield* sql`CREATE INDEX IF NOT EXISTS idx_email_rules_zone ON email_rules(zone_id)`
    yield* sql`CREATE INDEX IF NOT EXISTS idx_user_cookies_user ON user_cookies(user_username)`
  })
  ```
- Notes: Indexes for filter operations used in queries

#### Task 8: Create Module Exports
- File: `src/db/index.ts` (new file)
- Action: Export all schemas, types, repos, and layers for external use
- Implementation details:
  ```typescript
  // Schemas & Types
  export * from "./schema.ts"

  // Repositories
  export {
    makeZoneRepo,
    makeEmailRuleRepo,
    makeUserRepo,
    makeUserCookieRepo,
    getUserWithCookies,
    getUserListWithCookies,
    updateSignupUserCookies
  } from "./repos.ts"

  // Client Layer
  export { DatabaseLayer } from "./client.ts"
  ```

#### Task 9: Remove Prisma Package
- File: `packages/prisma/` (entire directory)
- Action: Remove the entire Prisma workspace package
- Notes: Use `rm -rf packages/prisma/` or delete via file system. User will update package.json separately.

### Acceptance Criteria

#### AC 1: Schema Definitions Match Prisma Structure
- [ ] Given: Prisma schema has 4 tables (zones, email_rules, users, user_cookies) + SameSite enum
- [ ] When: Schema.Struct definitions are created in `src/db/schema.ts`
- [ ] Then: All table structures match exactly with proper foreign keys and constraints

#### AC 2: Migrations Create Tables Successfully
- [ ] Given: Fresh database file at path specified by DATABASE_PATH ENV
- [ ] When: Migrator.run({ loader: Migrator.fromFileSystem("src/db/migrations") }) is executed
- [ ] Then: All 4 tables are created with proper schema and migrations table is populated

#### AC 3: Client Config Reads from ENV
- [ ] Given: DATABASE_PATH is set in .env file
- [ ] When: DatabaseLayer is provided to Effect application
- [ ] Then: SqliteClient connects to database at specified path

#### AC 4: Repository CRUD Operations Work
- [ ] Given: Repository is created using `makeRepository`
- [ ] When: Insert, update, findById, delete operations are executed
- [ ] Then: Operations complete successfully with proper type safety

#### AC 5: Custom Queries Return Expected Results
- [ ] Given: Database has test data
- [ ] When: `getUserWithCookies("testuser")` is called
- [ ] Then: Returns user object with cookies array matching Prisma behavior
- [ ] When: `updateSignupUserCookies("testuser", cookies)` is called
- [ ] Then: User has_account flag is set to true and cookies are upserted in single transaction

#### AC 6: Module Exports Work Correctly
- [ ] Given: `src/db/index.ts` exports are structured properly
- [ ] When: External code imports from `../db/index.ts`
- [ ] Then: All schemas, types, repos, and DatabaseLayer are accessible

#### AC 7: Prisma Package Removed
- [ ] Given: packages/prisma/ directory exists
- [ ] When: Removal task is completed
- [ ] Then: packages/prisma/ no longer exists and no @scraper/prisma imports remain in codebase

## Additional Context

### Dependencies

**Required Packages (user will install via package.json):**
- `@effect/sql-sqlite-bun` — SQLite client for Effect SQL
- `effect` (already installed) — Core Effect framework, version 4.0.0-beta.33

**Internal Dependencies:**
- Existing Effect ecosystem in project (Config, Schema, Layer)
- `src/cloudflare/index.ts` — for Zone/EmailRule seed data (NOT migrating seed scripts)

### Migration Execution

**To run migrations after implementation:**
```typescript
import { Migrator } from "effect/unstable/sql/Migrator"
import { FileSystem } from "effect/FileSystem"

const migrations = Migrator.fromFileSystem("src/db/migrations")
const result = yield* Migrator.run({ loader: migrations })
```

**Or create a setup script:** `src/db/setup.ts` that can be run once to initialize database schema.

### Testing Strategy

**NOT APPLICABLE** — Tests not part of current project workflow. Manual verification will be performed by:
1. Running migrations to create tables
2. Testing CRUD operations via repository functions
3. Testing custom queries with sample data
4. Verifying transaction rollback behavior

### Known Limitations

1. **Composite Key Handling**: `user_cookies` table has composite primary key (name, domain, user_username). `SqlModel.makeRepository` may not handle this correctly out-of-the-box. Custom repository methods may be needed.

2. **No Include Feature**: Effect SQL lacks Prisma's `include` for relations. All joins must be manual SQL with JSON aggregation or separate queries with manual composition.

3. **Migration File Format**: Migrations must be TypeScript Effects that execute SQL, NOT raw SQL files. Each migration file must default-export an `Effect<unknown, SqlError, SqlClient>`.

4. **Date Handling**: SQLite stores dates as TEXT (ISO 8601). Schema.DateTimeFromUtc will handle parsing, but ensure format consistency.

### Notes

- Existing `dev.db` has been backed up by user — clean slate approach
- User will handle `package.json` dependency updates (adding `@effect/sql-sqlite-bun`, removing Prisma)
- User will refactor `src/hero/HeroAppService.ts` separately after migration is complete
- Migration system automatically creates `effect_sql_migrations` table to track executed migrations
- WAL mode is enabled by default for better concurrent access
- Connection pooling is handled automatically by SqliteClient
- `.ts` extension required for relative imports in Bun
