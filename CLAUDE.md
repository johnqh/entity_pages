# Entity Pages

Page containers for entity/organization management in React applications.

**npm**: `@sudobility/entity_pages`

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Bun
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
