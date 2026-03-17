---
project_name: 'hero-scraper'
user_name: 'Vasyl'
date: '2026-03-17T15:33:50Z'
sections_completed: ['discovery', 'technology_stack', 'language_specific_rules', 'code_quality_rules', 'critical_rules']
existing_patterns_found: 12
refactoring_direction: 'simplify'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## ⚠️ REFACTORING IN PROGRESS

**Direction:** Simplifying architecture, migrating away from:
- Monorepo structure → Flat structure
- Over-engineered Effect services → Pragmatic Effect usage
- Workspace imports (`@scraper/*`) → Relative imports

---

## Technology Stack & Versions

### Core Runtime
- **Bun**: >=1.2.18 (primary)
- **Node.js**: >=22.0.0 (alternative)
- **pnpm**: >=9.0.0 (alternative)
- **TypeScript**: 5.9.3

### Framework & Libraries
- **Effect-ts**: 4.0.0-beta.33 (✅ Conscious choice, not tech debt)
- **@ulixee/hero**: 2.0.0-alpha.34 (✅ Conscious risk, browser automation is cutting-edge)
- **Prisma**: 6.2.1 with SQLite (⚠️ BEING REMOVED - migrating to `@effect/sql-sqlite-bun`)
- **imap**: 0.8.19 (email)
- **mailparser**: 3.9.4 (email parsing)
- **otpauth**: 9.5.0 (TOTP)
- **cloudflare**: 5.2.0 (Workers API)
- **geoip-lite**: 1.4.10 (IP geolocation)
- **fingerprint-generator**: 2.1.81

### Development Tools
- **Biome**: 2.4.7 (linting, formatting)
- **@effect/language-service**: 0.23.3 (IDE support)

### Configuration Files
- `tsconfig.json`: Extends `@tsconfig/bun`, strict mode, Effect LS plugin, `exactOptionalPropertyTypes: true`
- `biome.jsonc`: Tab indentation, double quotes, specific linter rules
- `bunfig.toml`: Exact installs, telemetry disabled, test config
- `bun.lock`: Lockfile (not bun.lockb due to `saveTextLockfile: true`)

### 🔧 CRITICAL: Research & Documentation Workflow
**MANDATORY approach for researching Effect-ts and other libraries:**

1. **For Effect-ts documentation:**
   - ✅ Use `context7` with library ID `/effect-ts/effect-smol` ONLY
   - ✅ Use `repomix MCP` to read `node_modules/effect/src/` folder (contains JSDoc + examples)
   - ❌ NEVER use `grep` for searching Effect code
   - ❌ NEVER guess API usage — always verify with source or docs

2. **For other libraries:**
   - ✅ Use `context7` to find relevant documentation
   - ✅ Use `repomix MCP` to read source code if needed
   - ✅ Use `LSP` tools for code exploration

3. **LSP Tools (MANDATORY for all code work):**

**All 9 LSP operations with practical examples:**

| Operation | Use Case | Example |
|-----------|----------|---------|
| `goToDefinition` | Find where symbol is defined | `LSP.goToDefinition` on `makeRepository` → jumps to `node_modules/effect/src/unstable/sql/SqlModel.ts` |
| `findReferences` | Find all usages of a symbol | `LSP.findReferences` on `UserCookie` → finds all places where the model is used |
| `hover` | Get type/docs for symbol at cursor | `LSP.hover` on `Model.BooleanSqlite` → shows JSDoc with explanation |
| `documentSymbol` | Get all symbols in a file | `LSP.documentSymbol` on `repos.ts` → lists all functions, classes, exports |
| `workspaceSymbol` | Search symbols across entire project | Search for `SqlResolver` across all files |
| `goToImplementation` | Find implementations of interface | `LSP.goToImplementation` on abstract method → finds concrete implementations |
| `prepareCallHierarchy` | Get call hierarchy for function | See what calls a function and what it calls |
| `incomingCalls` | Find all callers of a function | `LSP.incomingCalls` on `getUserWithCookies` → shows all places that call it |
| `outgoingCalls` | Find all functions called from here | `LSP.outgoingCalls` on function body → shows what this function calls |

**Common workflows:**

- **Understanding unknown API:** `LSP.hover` → `LSP.goToDefinition` → read source
- **Refactoring:** `LSP.findReferences` → see all usages before changing
- **Exploring new codebase:** `LSP.documentSymbol` → get file overview
- **Debugging:** `LSP.incomingCalls` → trace where function is called from
- **Impact analysis:** `LSP.findReferences` + `LSP.incomingCalls` → understand ripple effects

**This dramatically improves code quality, speed, and reduces errors.**

4. **When in doubt, READ SOURCE:**
   - `node_modules/effect/src/` for Effect internals (JSDoc + examples)
   - `node_modules/@effect/sql-sqlite-bun/src/` for SQLite client
   - Source code > documentation when API is unclear

### 📚 Available Skills for AI Agents

#### TypeScript Advanced Types
**Location:** `.claude/skills/typescript-advanced-types/SKILL.md`

**When to invoke:**
- Implementing complex type logic (generics, conditional types, mapped types)
- Creating reusable type utilities
- Building type-safe API clients
- Schema migration types (Prisma → Effect SQL)
- Type-safe form validation or state machines

**Usage:** Agents should use this skill when advanced type patterns are needed.

### Current Structure (Transition State)
```
src/                      # Main source code (flat structure)
  hero/                   # Browser automation
  imap/                   # Email listener
  ip-info/                # IP geolocation
  cloudflare/             # Workers scripts

packages/                 # ⚠️ BEING REMOVED (monorepo legacy)
  prisma/                 # TO BE MIGRATED to @effect/sql-sqlite-bun

resolutions/              # ✅ KEEPING (temporary external lib fixes)
  utf7/                   # IMAP dependency override
```

---

## Critical Implementation Rules

### Language-Specific Rules (TypeScript/Effect)

#### Configuration (CRITICAL)
- **`preserveSymlinks: false`** — NON-NEGOTIABLE. Bun/pnpm linking requirement. Without this, tsc won't find types in node_modules.
- **`exactOptionalPropertyTypes`** — Legacy setting from old Effect-ts recommendation. May be removed in future.
- **`strictNullChecks: true`** — Standard strict mode (always enabled)

#### Import Conventions
- ✅ **Relative imports with `.ts` extension**: `import { X } from './foo.ts'` (Bun requires this)
- ❌ **FORBIDDEN**: Workspace imports `@scraper/*` (monorepo legacy, being removed)
- ✅ Use `../` for parent directory navigation in flat structure

#### Effect Usage (Pragmatic, Not Dogmatic)
- ✅ **Use `Effect.gen`** for complex async flows and sequencing
- ✅ **`Schema.TaggedErrorClass`** for domain errors (good pattern, keep)
- ❌ **NOT everything** needs `Effect.Service()` — this was over-engineering
- ❌ **DO NOT USE** `_try/_promise/_tryMapPromise` helpers for new code (legacy over-engineering)
- ✅ **Pragmatic choice**: Use Effect where it adds value (error handling, composition), not as blanket pattern

#### Type Safety
- **`unknown` over `any`** — Enforce type checking
- **Type guards** over type assertions where possible
- **Discriminated unions** for state machines and error handling
- **LSP tools mandatory** — Always use `LSP.goToDefinition`, `findReferences`, `hover` for code work

#### Available Skills
- **`typescript-advanced-types`** — Use for complex type logic, generics, conditional types, type-safe patterns

---

### Framework-Specific Rules

_PENDING: Generated in next step_

---

### Code Quality & Style Rules

#### Biome Configuration (Enforced)
- **Tab indentation** — NOT spaces
- **Double quotes** — `"string"`, not `'string'`
- **LF line endings** — not CRLF
- **Linter rules enforced**:
  - `noParameterAssign`: error
  - `useAsConstAssertion`: error
  - `useDefaultParameterLast`: error
  - `useSingleVarDeclarator`: error
  - `noInferrableTypes`: error
  - `noUselessElse`: error
  - `useAsConstAssertion`: error
  - `useNumberNamespace`: error
  - `noUnusedTemplateLiteral`: error

#### Naming Conventions
- **Classes**: `PascalCase` → `HeroAppService`, `EmailListener`
- **Functions/Variables**: `camelCase` → `getHero`, `waitForMillis`
- **Type Aliases**: `TPrefix` → `TUser`, `TInputValue`, `TCookie`
- **Constants**: `SCREAMING_SNAKE_CASE` or `camelCase`
- **Private class fields**: `#prefix`

#### File Organization
- **Class files**: `PascalCase.ts` → `HeroAppService.ts`
- **Utility files**: `camelCase.ts` → `utils.ts`, `proxy.ts`
- **Each domain folder**: `index.ts` for exports
- ⚠️ **Domain folders TEMPORARY** — `hero/`, `imap/`, `ip-info/`, `cloudflare/` are copy-paste from monorepo migration, will be refactored. Domain approach is good, but current layout is temporary.

#### Import Order
1. Third-party: `import { Effect } from "effect"`
2. Local relative: `import { X } from "../foo.ts"`
3. Type-only: `import type { Y } from "./bar.ts"`

#### Documentation
- **JSDoc** for complex functions only (`@param`, `@returns`)
- **`@deprecated`** for legacy code
- **TODO/FIXME** for temporary workarounds

---

### Testing Rules

**NOT APPLICABLE** — Tests not currently part of the project workflow. Focus on implementation and refactoring first.

---

### Development Workflow Rules

**NOT APPLICABLE** — User handles all git operations (branches, commits, PRs) independently. No automated workflow rules required.

---

### Critical Don't-Miss Rules

#### Anti-Patterns (NEVER Do)
1. ❌ **Workspace imports `@scraper/***` — DEAD, causes tsc failures
2. ❌ **`Effect.Service()` blanket pattern** — over-engineering legacy
3. ❌ **`_try/_promise/_tryMapPromise` helpers** — legacy, don't use for new code
4. ❌ **New Prisma code** — deprecated, migrating to `@effect/sql-sqlite-bun`
5. ❌ **Large async/await with single catch** — misses Effect's error handling value

#### Critical Edge Cases (Non-Negotiable)
1. **`preserveSymlinks: false`** — MANDATORY for Bun/pnpm linking. Without this, tsc won't find types in node_modules.
2. **`.ts` extensions in imports** — REQUIRED by Bun: `import { X } from './foo.ts'`
3. **Beta/alpha versions** — Effect-ts 4.0.0-beta.33, Hero 2.0.0-alpha.34 = conscious choices, not tech debt
4. **LSP tools** — ALWAYS use `goToDefinition`, `findReferences`, `hover` for code navigation
5. **Documentation workflow** — For Effect-ts: use `context7` (`/effect-ts/effect-smol`) OR read `node_modules/effect/src/`. NEVER use `grep` for code search.
6. **Source-first approach** — When API is unclear, READ SOURCE FILES in `node_modules/effect/src/` (contains JSDoc + examples)

#### Security
1. **`.env` file** — NEVER commit (contains secrets)
2. **`credentials.json`** — stored separately, NOT in git
3. **Environment variables only** — for API tokens, secrets

#### Effect Usage (Pragmatic Balance)
- ✅ **Use Effect for error handling** — this is the primary value Effect provides
- ✅ **Use Effect for composition** — `Effect.gen` for sequencing
- ✅ **Small operations** → bare `Effect.tryPromise` is fine
- ✅ **Reusable domain logic** → can use services IF genuinely reusable
- ❌ **NOT blanket `Effect.Service()`** — was over-engineering, use sparingly
- ❌ **NOT large async/await wrappers** — defeats error handling value

**Pragmatism Threshold:**
- If operation needs proper error handling → Use Effect
- If operation is simple AND uncaught throw is acceptable → async/await OK
- If operation composes multiple async operations → Use Effect
- If operation is reusable across codebase → Consider service (carefully, not by default)

---

## Summary

**Project Refactoring Direction:**
- Away from: Monorepo, over-engineered Effect services, workspace imports
- Toward: Flat structure, pragmatic Effect usage, relative imports

**Key Migration:**
- Prisma → `@effect/sql-sqlite-bun`
- Workspace imports → Relative imports
- Service pattern → Pragmatic Effect usage

**Critical for AI Agents:**
1. LSP tools are MANDATORY for all code work
2. Documentation workflow: For Effect-ts → use `context7` (`/effect-ts/effect-smol`) or read `node_modules/effect/src/`
3. `preserveSymlinks: false` is non-negotiable
4. `.ts` extensions required in imports
5. Prisma is DEPRECATED — don't write new code with it
6. Effect is a tool for error handling, not a religion
7. READ SOURCE when API is unclear — `node_modules/effect/src/` contains JSDoc + examples

### 🎯 Key Architectural Decisions

1. **Pragmatic Effect Usage**: NOT everything needs `Effect.Service()`. Use Effect where it adds value (error handling, composition), not as a blanket pattern.

2. **Flat Imports**: Use relative imports, NOT workspace imports (`@scraper/*`).

3. **Simple Structure**: Prefer flat `src/` organization over nested packages.
