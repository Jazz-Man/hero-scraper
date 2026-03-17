---
title: 'Refactor src/faker.ts to Effect-ts Service'
slug: 'refactor-faker-effect'
created: '2026-03-17T20:00:00Z'
status: 'ready-for-dev'
tech_stack: ['@faker-js/faker', 'Effect.ts ServiceMap', 'Effect Layer']
files_to_modify: ['src/faker.ts']
---

# Quick Spec: Refactor src/faker.ts to Effect-ts Service

**Created:** 2026-03-17T20:00:00Z

## Overview

Refactor `src/faker.ts` to properly wrap Faker.js in Effect-ts service pattern, removing deprecated exports and ensuring all Faker usage goes through Effect service layer.

## Current State Issues

1. **Deprecated default export** - `export default faker` is marked `@deprecated`
2. **Mixed paradigms** - Direct instance creation alongside Effect service
3. **Unused error** - `FakerError` defined but never used

## Target State

### API Design (User Choice)

```typescript
// Service method returns Faker instance
const fakerService = yield* FakerService;
const faker = fakerService.faker();
const name = faker.person.fullName(); // direct faker usage
```

### Default Export Behavior

Replace deprecated export with service instance for backward compatibility:

```typescript
// Old (deprecated):
import faker from './faker.ts';

// New:
import { FakerService } from './faker.ts';
// or via layer
```

## Implementation

### 1. Remove deprecated code
- Remove `export default faker`
- Remove `@deprecated` comment
- Keep `FakerError` (may be used later for wrapper methods)

### 2. Simplify FakerService
- Keep current structure: `faker` method returns `Faker` instance
- Each call creates fresh instance (already implemented correctly)
- Keep `Layer.effect` pattern

### 3. Add convenience export (optional)
```typescript
// For direct usage without layer
export const faker = new Faker({ locale: [en_US, en, base] });
```

## Acceptance Criteria

Given: The refactored `src/faker.ts`

When: Importing FakerService
Then: Service provides `faker()` method that returns Faker instance

When: Calling `fakerService.faker()`
Then: Returns new Faker instance with correct locales

When: File is compiled
Then: No TypeScript errors, no deprecated warnings

## Files to Modify

| File | Changes |
|------|---------|
| `src/faker.ts` | Remove deprecated export, clean up service |

## Out of Scope

- Wrapping individual Faker methods in Effect
- Adding error handling to Faker calls
- Changing existing usage in other files (if any)
