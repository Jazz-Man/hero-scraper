# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web scraper built with Bun, TypeScript, and Effect-ts. Uses @ulixee/hero for browser automation with anti-detection capabilities (fingerprinting, proxy management). Targets freebitco.in with account management via Prisma/SQLite and email verification via IMAP.

## Commands

### Installation
```bash
bun install
```

### Running
```bash
bun run index.ts
```

### Database (Prisma)
Run from root - uses workspace filter:
```bash
bun --filter '@scraper/prisma' db:ui          # Prisma Studio
bun --filter '@scraper/prisma' db:migrate:dev  # Create migration
bun --filter '@scraper/prisma' db:push         # Push schema changes
bun --filter '@scraper/prisma' db:seed         # Seed database
bun --filter '@scraper/prisma' db:reset        # Reset and reseed
```

### Development
```bash
bun run hero:cloud           # Start Hero cloud with local env
bun run cf:create            # Create Cloudflare Workers
bun run cf:delete            # Delete Cloudflare Workers
bun run imap:test            # Test IMAP connection
```

## Architecture

### Effect-Based Services
This codebase uses Effect-ts for functional programming with dependency injection. Services follow this pattern:

```typescript
// Service definition with dependencies
export class MyService extends Effect.Service<MyService>()("MyService", {
  effect: Effect.gen(function* () {
    const dep = yield* SomeOtherService;
    return { method: (...) => ... };
  }),
  dependencies: [SomeOtherService.Default],
}) {}

// Layer for composition
export const MyServiceLive = Layer.merge(MyService.Default, SomeOtherLive);
```

**Key services:**
- `HeroAppService` - Creates Hero instances with fingerprinting/proxy
- `HeroClientService` - High-level browser operations (goto, click, type, etc.)
- `IpInfoService` - IP geolocation lookup with proxy detection
- `EmailListener` - IMAP email monitoring for OTP/verification

### Error Handling
Use `Schema.TaggedErrorClass` for domain errors:

```typescript
export class MyError extends Schema.TaggedErrorClass<MyError>("@scraper/app/MyError")("MyError", {
  field: Schema.String,
}) {}
```

Convert promise-based operations to Effects using:
- `_try(fn, method)` - Sync operations
- `_promise(fn, method)` - Promise operations
- `_tryMapPromise(fn, method)` - Promise map operations

These handle `TimeoutError` and network errors (`net::`) automatically.

### Browser Automation
Hero instances are configured with:
- Chrome fingerprinting (macOS, desktop only)
- Proxy IP masking via `upstreamProxyIpMask`
- DNS-over-TLS (OpenDNS)
- Timezone/locale matching from IP geolocation
- Profile cookies for session persistence

Cookie management goes through `@scraper/prisma` with `TUserCookies` type.

### Workspace Structure
```
packages/
  prisma/        # @scraper/prisma - Database client and queries
resolutions/
  utf7/          # Dependency override for IMAP
src/
  hero/          # Browser automation services
  imap/          # Email listener
  ip-info/       # IP geolocation service
  cloudflare/    # Workers deployment scripts
```

## Configuration

- **TypeScript**: Extends `@tsconfig/bun`, includes Effect language service plugin
- **Linting**: Biome with tab indentation, double quotes
- **Dependencies**: Bun workspaces with hoisting for `better-sqlite3`
- **Node**: >=22 required (also supports pnpm >=9)

## Important Notes

- Use `Effect.gen` instead of async/await for service logic
- Always use `_try`, `_promise`, or `_tryMapPromise` when wrapping non-Effect code
- Network errors may be retried automatically using `Schedule.exponential`
- Cloudflare challenges are detected via `cf-mitigated` header
- Proxy URL comes from `IpInfoService.getIpData()` which includes `ip`, `timezone`, `country`, and `proxy`
