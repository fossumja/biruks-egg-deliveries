# TypeScript Standards

Use strict, explicit typing for all app code, and validate untrusted data at boundaries. This is the source of truth for TypeScript patterns in this repo.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: TypeScript language usage and typing patterns
- **Non-goals**: Angular-specific patterns, testing strategy, or accessibility rules
- **Applies to**: `src/app/**`, `src/testing/**`, and `scripts/**`

## Purpose

These rules keep the app predictable, safe to refactor, and friendly to strict compilation. When a rule conflicts with a library requirement, follow the library and document the exception.

## Repo defaults (do not weaken without an ADR)

- `strict: true` and Angular strict template checks stay enabled.
- `noImplicitReturns`, `noImplicitOverride`, and `noPropertyAccessFromIndexSignature` stay enabled.
- `skipLibCheck: true` is allowed only for dependency typings. Do not rely on it to ignore app errors.

## Core rules

- Do not use `any` in app code. Use `unknown` and narrow, or add a real type.
- Prefer type inference for locals, but add explicit types for public exports, service APIs, and state models.
- Use `type` for unions and utility types. Use `interface` for object shapes intended to be implemented or extended.
- Favor string literal unions over enums unless a library requires enums.
- Use `readonly` and `as const` for immutable data and configuration objects.
- Keep data transformations pure. Avoid in-place mutation of shared objects and arrays.

## Nullability and optional values

- Treat `null` and `undefined` as distinct signals. Do not overload them.
- Use optional chaining and nullish coalescing for defensive reads.
- Avoid `!` non-null assertions. If unavoidable, add a short comment explaining why it is safe.

## Runtime boundaries

Validate all data that crosses a boundary before using it:

- CSV import and export.
- IndexedDB or local storage reads.
- JSON parsing from APIs or files.

Use type guards or small parsing helpers to keep validation close to usage.

```ts
type DeliveryRow = {
  id: string;
  name: string;
  dozens: number;
};

const isDeliveryRow = (value: unknown): value is DeliveryRow => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.dozens === 'number'
  );
};

export const parseDeliveryRow = (value: unknown): DeliveryRow => {
  if (!isDeliveryRow(value)) {
    throw new Error('Invalid delivery row');
  }

  return value;
};
```

## Error handling

- Throw `Error` instances, not strings.
- Use explicit error messages that explain the failed expectation.
- Prefer returning typed results for predictable flows instead of swallowing errors.

## Favor type-safe configuration

Use `satisfies` to keep config objects precise without losing inference.

```ts
const exportColumns = [
  'name',
  'address',
  'dozens',
] as const;

type ExportColumn = (typeof exportColumns)[number];

const columnLabels = {
  name: 'Name',
  address: 'Address',
  dozens: 'Dozens',
} satisfies Record<ExportColumn, string>;
```

## Related docs

- `docs/dev/best-practices/angular-standards.md`
- `docs/dev/best-practices/testing-practices.md`
- `docs/dev/best-practices/accessibility.md`
- `docs/dev/best-practices/file-naming.md`
- `docs/dev/best-practices/documentation-style-guide.md`
