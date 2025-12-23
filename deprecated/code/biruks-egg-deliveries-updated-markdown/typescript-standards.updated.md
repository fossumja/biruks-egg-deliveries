# TypeScript standards

- **Status**: Stable
- **Owner**: (set per-repo)
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: TypeScript configuration and typing rules for app-scale safety
- **Applies to**: `src/` TypeScript code (and shared tooling where relevant)
- **Non-goals**: framework-specific rules (see Angular standards)

## Rules (concise, grouped)

### Compiler strictness (baseline)
References: [TSConfig reference](https://www.typescriptlang.org/tsconfig), [Handbook](https://www.typescriptlang.org/docs/handbook/)

Enable strictness for correctness. Required baseline:

- `"strict": true`
- `"noImplicitAny": true` (implied by `strict`)
- `"strictNullChecks": true` (implied by `strict`)
- `"noUncheckedIndexedAccess": true`
- `"exactOptionalPropertyTypes": true`
- `"useUnknownInCatchVariables": true`
- `"noImplicitOverride": true`
- `"noFallthroughCasesInSwitch": true`

Guidance:

- Add strict flags intentionally and fix issues rather than suppressing with `any`.
- If a strict flag is temporarily not feasible, document the rationale in the repo and add a plan to re-enable it.

### Types at boundaries (runtime vs compile time)
References: [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

- Treat all external inputs as `unknown`:
  - network responses
  - `localStorage`/`sessionStorage`
  - CSV rows and user-provided strings
- Validate at the boundary and convert to a safe internal type.
- Do not “cast to make it compile” at boundaries (`as SomeType`) without a runtime check.

### Prefer `unknown` over `any`
References: [Basic types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)

- `any` disables type safety. Avoid it.
- Use `unknown` and narrow with:
  - `typeof`
  - `instanceof`
  - property checks (`in`)
  - custom type guards

### Use `satisfies` to validate shapes without losing inference
Reference: [`satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)

- Prefer `satisfies` for config objects and constant maps so TypeScript verifies the shape while preserving literal types.

### Exported APIs and shared types
References: [Modules](https://www.typescriptlang.org/docs/handbook/modules.html)

- Be explicit about exports.
- Prefer **named exports** for most code.
- Avoid default exports in shared libraries (harder refactors), unless a framework convention requires it.
- Keep domain types in stable locations (avoid deep, fragile import paths).

### Enums and unions
References: [Unions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)

- Prefer **string literal unions** over `enum` for most app code.
- If you need runtime values, use a `const` object + `as const` and derive the union type.

## Do / Don’t

- **Do** model state with discriminated unions.
- **Do** prefer readonly collections and immutable updates for shared state.
- **Do** write small, composable type guards.
- **Don’t** use `as any` to bypass the compiler.
- **Don’t** export deep internal types from feature folders.

## Minimal examples

### `unknown` boundary + type guard

```ts
type DeliveryRow = {
  name: string;
  dozens: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseDeliveryRow(input: unknown): DeliveryRow {
  if (!isRecord(input)) {
    throw new Error('Row must be an object');
  }

  const name = input['name'];
  const dozens = input['dozens'];

  if (typeof name !== 'string') {
    throw new Error('name must be a string');
  }
  if (typeof dozens !== 'number' || !Number.isFinite(dozens)) {
    throw new Error('dozens must be a finite number');
  }

  return { name, dozens };
}
```

### `satisfies` for config objects

```ts
const ROUTES = [
  { path: '', title: 'Home' },
  { path: 'deliveries', title: 'Deliveries' },
] satisfies ReadonlyArray<{ path: string; title: string }>;
```

### String union from `as const`

```ts
const CSV_VERSION = {
  v1: 'v1',
  v2: 'v2',
} as const;

type CsvVersion = (typeof CSV_VERSION)[keyof typeof CSV_VERSION];
```

## Common pitfalls and anti-patterns

- Converting `unknown` to a domain type via `as DomainType` without validation.
- Disabling strictness to “move faster” and creating long-term brittleness.
- Forgetting `noUncheckedIndexedAccess` implications (you must check for `undefined`).
- Using broad record types (a `Record` mapping string keys to unknown) where a specific interface would be safer.
- Catching errors as `any` and assuming properties exist (use `unknown` in catch).

## Version watchlist (TypeScript 5.7+)

Re-check this doc when upgrading TypeScript:

- New strict flags or changed defaults in `tsconfig`.
- Changes to `moduleResolution`, ESM/CJS interop guidance, or `verbatimModuleSyntax`.
- New language features that replace local patterns (example: new narrowing improvements).