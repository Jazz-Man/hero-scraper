---
project_name: 'hero-scraper'
user_name: 'Vasyl'
date: '2026-03-17T15:33:50Z'
sections_completed: ['discovery', 'technology_stack', 'language_specific_rules', 'code_quality_rules']
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

### 🔧 CRITICAL: LSP Tools Usage
**ALWAYS use Claude Code's built-in LSP tool for code exploration and work.**
- Use `LSP.goToDefinition` to find symbol definitions
- Use `LSP.findReferences` to see where symbols are used
- Use `LSP.documentSymbol` to get file structure
- Use `LSP.hover` to get type information
- **This dramatically improves code quality, speed, and reduces errors.**

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
**ALWAYS use Claude Code's built-in LSP tool for code exploration and work.**
- Use `LSP.goToDefinition` to find symbol definitions
- Use `LSP.findReferences` to see where symbols are used
- Use `LSP.documentSymbol` to get file structure
- Use `LSP.hover` to get type information
- **This dramatically improves code quality, speed, and reduces errors.**

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

_PENDING: Assessing if tests exist in project_

### 🎯 Key Architectural Decisions

1. **Pragmatic Effect Usage**: NOT everything needs `Effect.Service()`. Use Effect where it adds value (error handling, composition), not as a blanket pattern.

2. **Flat Imports**: Use relative imports, NOT workspace imports (`@scraper/*`).

3. **Simple Structure**: Prefer flat `src/` organization over nested packages.
