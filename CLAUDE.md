# Entity Pages

Page containers for entity/organization management in React applications.

**npm**: `@sudobility/entity_pages`

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Bun
- **Package Manager**: Bun (do not use npm/yarn/pnpm for installing dependencies)
- **Build**: TypeScript compiler (dual ESM/CJS)
- **UI**: Requires @sudobility/entity-components
- **Data**: Uses @sudobility/entity_client hooks

## Project Structure

```
src/
├── index.ts          # Public exports
└── pages/            # Page components
    ├── index.ts      # Page exports
    ├── EntityListPage.tsx     # Entity selector/list
    ├── EntitySettingsPage.tsx # Entity settings
    ├── MembersPage.tsx        # Member management
    └── InvitationsPage.tsx    # Invitation management
```

## Commands

```bash
bun run build        # Build ESM + CJS to dist/
bun run clean        # Remove dist/
bun run typecheck    # TypeScript check
bun run lint         # Run ESLint
bun test             # Run tests
```

## Pages

| Page | Purpose |
|------|---------|
| `EntityListPage` | Display and select user's entities |
| `EntitySettingsPage` | Edit entity name, settings |
| `MembersPage` | View/add/remove members |
| `InvitationsPage` | Manage pending invitations |

## Usage

```tsx
import { EntityListPage, MembersPage } from '@sudobility/entity_pages';

// In your router
<Route path="/entities" element={<EntityListPage />} />
<Route path="/entities/:slug/members" element={<MembersPage />} />
```

## Props Pattern

All pages accept common props:
```typescript
interface PageProps {
  networkClient: NetworkClient;
  baseUrl: string;
  token: string;
  userId: string;
  entitySlug?: string;
  onEntityChange?: (entity: Entity) => void;
  className?: string;
}
```

## Peer Dependencies

Required in consuming app:
- `react` >= 18.0.0
- `@tanstack/react-query` >= 5.0.0
- `@sudobility/types` - Common types
- `@sudobility/entity_client` - Data hooks
- `@sudobility/entity-components` - UI components

## Publishing

```bash
bun run build        # Build first
npm publish          # Publish to npm
```

## Architecture

```
entity_pages (this package)
    ├── entity_client (data layer)
    └── entity-components (UI layer)
        ↑
shapeshyft_app (consumes pages)
```

## Code Patterns

### Page Composition
```typescript
// Pages compose hooks + components
export function MembersPage(props: PageProps) {
  const { data, isLoading } = useMembers(props.entitySlug, props.token);

  if (isLoading) return <LoadingState />;

  return <MembersList members={data} onRemove={handleRemove} />;
}
```

### Error Boundaries
- Each page should be wrapped in an error boundary
- Pages show inline errors for data fetching failures

## Workspace Context

This project is part of the **ShapeShyft** multi-project workspace at the parent directory. See `../CLAUDE.md` for the full architecture, dependency graph, and build order.

## Downstream Impact

| Downstream Consumer | Relationship |
|---------------------|-------------|
| `shapeshyft_app` | Direct dependency - renders entity management pages |

After making changes:
1. Run checks (no `verify` script - see below)
2. `npm publish`
3. In `shapeshyft_app`: `bun update @sudobility/entity_pages` -> rebuild

Note: this package depends on `@sudobility/entity_client` and `@sudobility/entity-components`, which are **separate repos outside this workspace**.

## Local Dev Workflow

```bash
# In this project:
bun link

# In shapeshyft_app:
bun link @sudobility/entity_pages

# Rebuild after changes:
bun run build

# When done, unlink:
bun unlink @sudobility/entity_pages && bun install
```

## Pre-Commit Checklist

No `verify` script. Run checks manually:

```bash
bun run type-check && bun run lint && bun test && bun run build
```

## Gotchas

- **Typecheck command is `type-check` (hyphenated)** -- differs from most other workspace projects which use `typecheck`. Running `bun run typecheck` will silently do nothing.
- **This package does NOT depend on `entity_service`** -- despite similar naming. It depends on `@sudobility/entity_client` (frontend hooks) and `@sudobility/entity-components` (UI), which are separate repos.
- **Vite library mode build** -- produces ESM + UMD. Build is `tsc && vite build`, not just `tsc`.
- **Heavy peer dependency list (7 packages)** -- missing any causes confusing build errors in consumers.
