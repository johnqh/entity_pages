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
  MembersManagementPage,
  InvitationsPage,
  ApiKeysPage,
} from '@sudobility/entity_pages';
import { EntityClient } from '@sudobility/entity_client';

const client = new EntityClient({ baseUrl, networkClient });

// In your router
<Route path="/workspaces" element={
  <EntityListPage client={client} onSelectEntity={handleSelect} />
} />
<Route path="/workspaces/:slug/members" element={
  <MembersManagementPage client={client} entity={entity} currentUserId={userId} />
} />
<Route path="/invitations" element={
  <InvitationsPage client={client} />
} />
<Route path="/workspaces/:slug/api-keys" element={
  <ApiKeysPage client={client} entity={entity} />
} />
```

## API

### Pages

| Component | Description |
|-----------|-------------|
| `EntityListPage` | List and select the user's entities |
| `MembersManagementPage` | View members, change roles, remove members |
| `InvitationsPage` | Accept or decline invitations addressed to the user |
| `ApiKeysPage` | Create, rename, deactivate, and revoke entity API keys |

Each page is exported alongside its props type (`EntityListPageProps`,
`MembersManagementPageProps`, `InvitationsPageProps`, `ApiKeysPageProps`).

### Props

Every page takes an `EntityClient` and fetches its own data through
`@sudobility/entity_client` hooks. There is no shared `PageProps` base.

```typescript
interface EntityListPageProps {
  /** Entity API client */
  client: EntityClient;
  /** Handler for selecting an entity */
  onSelectEntity?: (entity: EntityWithRole) => void;
  /** Handler for navigating to entity settings */
  onNavigateToSettings?: (entitySlug: string) => void;
}

interface MembersManagementPageProps {
  client: EntityClient;
  /** Entity to manage */
  entity: EntityWithRole;
  /** Current user's ID */
  currentUserId: string;
}

interface InvitationsPageProps {
  client: EntityClient;
  /** Callback when an invitation is accepted */
  onInvitationAccepted?: () => void;
}

interface ApiKeysPageProps {
  client: EntityClient;
  /** Entity whose keys are managed */
  entity: EntityWithRole;
}
```

### API Keys

`ApiKeysPage` manages entity-scoped keys -- credentials that authenticate a
caller as the entity itself, for CI jobs, scripts, and integrations that should
outlive any individual member. The server stores only a hash, so a new key's
secret appears once in a one-time reveal panel and cannot be retrieved again.

The page derives its own gating from the member's role via
`getPermissionsForRole(entity.userRole).canManageApiKeys`: Owners and Managers
get create, rename, activate/deactivate, and revoke; Members see the list
read-only.

### Scope

These pages cover entities, members, invitations, and entity API keys.
Application-specific credentials stay in the consuming app: LLM provider keys,
per-project keys, and cloud storage configuration differ in shape and API
surface from one product to the next.

`entity_service` derives an `EntityPermissions` set from the member's role
(Owner > Manager > Member) and enforces it server-side. `ApiKeysPage` mirrors
that check client-side to hide controls the API would reject; pages that take
no `entity` prop leave gating to the caller.

### Peer Dependencies

- `react` >= 18.0.0
- `@tanstack/react-query` >= 5.0.0
- `@sudobility/types` -- shared type definitions
- `@sudobility/entity_client` -- data hooks
- `@sudobility/entity-components` -- UI components

## Development

```bash
bun run build        # Build to dist/
bun run dev          # Rebuild on change
bun run type-check   # TypeScript check (note: hyphenated)
bun run lint         # ESLint
bun run format       # Prettier
bun run test         # Vitest
```

## License

BUSL-1.1
