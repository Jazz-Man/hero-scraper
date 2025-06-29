# TypeScript Configuration for Scraper Monorepo

This package provides standardized TypeScript configurations for the Scraper monorepo.

## Available Configurations

### Base Configuration

The root `tsconfig.json` extends from `@tsconfig/bun` and provides common configuration settings suitable for Bun.sh applications, including DOM and WebWorker support.

```json
{
  "extends": "@scraper/tsconfig/tsconfig.json"
}
```

### Application Configuration

For application packages (apps, services, etc.):

```json
{
  "extends": "@scraper/tsconfig/base/application.json"
}
```

### Library Configuration

For library packages (shared utilities, modules, etc.):

```json
{
  "extends": "@scraper/tsconfig/base/library.json"
}
```

## Usage

1. Add this package to your project's devDependencies:

```bash
bun add -d @scraper/tsconfig@workspace:*
```

2. Create a `tsconfig.json` file in your package that extends one of the configurations:

```json
{
  "extends": "@scraper/tsconfig/base/library.json",
  "compilerOptions": {
    // Your package-specific options here
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Configuration Features

- Bun-optimized compiler options
- ESNext module support
- DOM and WebWorker typings
- Strict type checking
- Decorator support
- Project references for monorepo
- Path aliasing

## Customizing

Each package can customize its own TypeScript configuration by extending the base configurations and adding package-specific options.