# @sudobility/entity_pages

Page containers for entity/organization management in React web applications.

## Installation

```bash
bun add @sudobility/entity_pages
```

## Usage

```tsx
import {
  EntityListPage,
  EntitySettingsPage,
  MembersPage,
  InvitationsPage,
} from '@sudobility/entity_pages';

// In your router
<Route path="/entities" element={<EntityListPage />} />
<Route path="/entities/:slug/members" element={<MembersPage />} />
<Route path="/entities/:slug/settings" element={<EntitySettingsPage />} />
<Route path="/invitations" element={<InvitationsPage />} />
```

## API

### Pages

| Component | Description |
|-----------|-------------|
| `EntityListPage` | Display and select user's entities |
| `EntitySettingsPage` | Edit entity name and settings |
| `MembersPage` | View, add, and remove members |
| `InvitationsPage` | Manage pending invitations |

### Common Props

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

### Peer Dependencies

- `react` >= 18.0.0
- `@tanstack/react-query` >= 5.0.0
- `@sudobility/types` -- shared type definitions
- `@sudobility/entity_client` -- data hooks
- `@sudobility/entity-components` -- UI components

## Development

```bash
bun run build        # Build ESM + CJS to dist/
bun run clean        # Remove dist/
bun run type-check   # TypeScript check (note: hyphenated)
bun run lint         # ESLint
bun test             # Run tests
```

## License

BUSL-1.1
