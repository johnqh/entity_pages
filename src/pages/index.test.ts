/**
 * @fileoverview Tests for Entity Pages module exports
 */

import { describe, test, expect, vi } from 'vitest';

// Mock @sudobility/entity_client
vi.mock('@sudobility/entity_client', () => ({
  EntityClient: vi.fn(),
  useEntities: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateEntity: vi.fn(() => ({ mutate: vi.fn() })),
  useEntityMembers: vi.fn(() => ({ data: [], isLoading: false })),
  useUpdateMemberRole: vi.fn(() => ({ mutate: vi.fn() })),
  useRemoveMember: vi.fn(() => ({ mutate: vi.fn() })),
  useEntityInvitations: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateInvitation: vi.fn(() => ({ mutate: vi.fn() })),
  useCancelInvitation: vi.fn(() => ({ mutate: vi.fn() })),
  useMyInvitations: vi.fn(() => ({ data: [], isLoading: false })),
  useAcceptInvitation: vi.fn(() => ({ mutate: vi.fn() })),
  useDeclineInvitation: vi.fn(() => ({ mutate: vi.fn() })),
  useEntityApiKeys: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateApiKey: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateApiKey: vi.fn(() => ({ mutate: vi.fn() })),
  useRevokeApiKey: vi.fn(() => ({ mutate: vi.fn() })),
}));

// Mock @sudobility/entity-components
vi.mock('@sudobility/entity-components', () => ({
  EntityList: vi.fn(() => null),
  MemberList: vi.fn(() => null),
  InvitationForm: vi.fn(() => null),
  InvitationList: vi.fn(() => null),
}));

// Mock @sudobility/components (transitive dependency)
vi.mock('@sudobility/components', () => ({}));

import {
  EntityListPage,
  MembersManagementPage,
  InvitationsPage,
  ApiKeysPage,
} from './index';

describe('entity_pages exports', () => {
  test('exports EntityListPage component', () => {
    expect(EntityListPage).toBeDefined();
    expect(typeof EntityListPage).toBe('function');
  });

  test('exports MembersManagementPage component', () => {
    expect(MembersManagementPage).toBeDefined();
    expect(typeof MembersManagementPage).toBe('function');
  });

  test('exports InvitationsPage component', () => {
    expect(InvitationsPage).toBeDefined();
    expect(typeof InvitationsPage).toBe('function');
  });

  test('exports ApiKeysPage component', () => {
    expect(ApiKeysPage).toBeDefined();
    expect(typeof ApiKeysPage).toBe('function');
  });
});

describe('EntityListPage', () => {
  test('is a valid React function component', () => {
    // React function components have a name property
    expect(EntityListPage.name).toBe('EntityListPage');
  });
});

describe('MembersManagementPage', () => {
  test('is a valid React function component', () => {
    expect(MembersManagementPage.name).toBe('MembersManagementPage');
  });
});

describe('InvitationsPage', () => {
  test('is a valid React function component', () => {
    expect(InvitationsPage.name).toBe('InvitationsPage');
  });
});

describe('ApiKeysPage', () => {
  test('is a valid React function component', () => {
    expect(ApiKeysPage.name).toBe('ApiKeysPage');
  });
});
