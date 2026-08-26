/**
 * @fileoverview Tests for ApiKeysPage component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUseEntityApiKeys = vi.fn();
const mockUseCreateApiKey = vi.fn();
const mockUseUpdateApiKey = vi.fn();
const mockUseRevokeApiKey = vi.fn();

vi.mock('@sudobility/entity_client', () => ({
  EntityClient: vi.fn(),
  useEntityApiKeys: (...args: unknown[]) => mockUseEntityApiKeys(...args),
  useCreateApiKey: (...args: unknown[]) => mockUseCreateApiKey(...args),
  useUpdateApiKey: (...args: unknown[]) => mockUseUpdateApiKey(...args),
  useRevokeApiKey: (...args: unknown[]) => mockUseRevokeApiKey(...args),
}));

vi.mock('@sudobility/components', () => ({
  ContentLayout: ({
    header,
    children,
  }: {
    header: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {header}
      {children}
    </div>
  ),
}));

import { ApiKeysPage } from './ApiKeysPage';

const ownerEntity: any = {
  id: 'entity-1',
  entitySlug: 'abc12345',
  entityType: 'organization',
  displayName: 'Acme',
  userRole: 'owner',
};

const memberEntity: any = { ...ownerEntity, userRole: 'member' };

const activeKey = {
  id: 'key-1',
  entityId: 'entity-1',
  keyName: 'CI deploy',
  keyPrefix: 'shyft_a1b2c3',
  createdByUserId: 'user-1',
  isActive: true,
  lastUsedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function setupHooks({
  keys = [activeKey],
  isLoading = false,
  isError = false,
  createResult = { ...activeKey, key: 'shyft_plaintext_secret' },
}: {
  keys?: any[];
  isLoading?: boolean;
  isError?: boolean;
  createResult?: any;
} = {}) {
  const createMutate = vi.fn().mockResolvedValue(createResult);
  const updateMutate = vi.fn().mockResolvedValue(activeKey);
  const revokeMutate = vi.fn().mockResolvedValue(undefined);
  const refetch = vi.fn();

  mockUseEntityApiKeys.mockReturnValue({
    data: keys,
    isLoading,
    isError,
    error: isError ? new Error('boom') : null,
    refetch,
  });
  mockUseCreateApiKey.mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  });
  mockUseUpdateApiKey.mockReturnValue({
    mutateAsync: updateMutate,
    isPending: false,
  });
  mockUseRevokeApiKey.mockReturnValue({
    mutateAsync: revokeMutate,
    isPending: false,
  });

  return { createMutate, updateMutate, revokeMutate, refetch };
}

describe('ApiKeysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("lists an entity's keys with their display prefix", () => {
    setupHooks();
    render(<ApiKeysPage client={{} as any} entity={ownerEntity} />);

    expect(screen.getByText('CI deploy')).toBeInTheDocument();
    expect(screen.getByText('shyft_a1b2c3...')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('creates a key and reveals the secret exactly once', async () => {
    const { createMutate } = setupHooks();
    render(<ApiKeysPage client={{} as any} entity={ownerEntity} />);

    fireEvent.change(screen.getByLabelText('Key name'), {
      target: { value: 'Deploy bot' },
    });
    fireEvent.click(screen.getByText('Create Key'));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        entitySlug: 'abc12345',
        request: { key_name: 'Deploy bot' },
      });
    });

    expect(
      await screen.findByText('shyft_plaintext_secret')
    ).toBeInTheDocument();

    // Dismissing the reveal removes the secret from the page for good
    fireEvent.click(screen.getByText('Done'));
    await waitFor(() => {
      expect(
        screen.queryByText('shyft_plaintext_secret')
      ).not.toBeInTheDocument();
    });
  });

  test('does not submit an empty key name', () => {
    const { createMutate } = setupHooks();
    render(<ApiKeysPage client={{} as any} entity={ownerEntity} />);

    fireEvent.click(screen.getByText('Create Key'));
    expect(createMutate).not.toHaveBeenCalled();
  });

  test('toggles a key between active and inactive', async () => {
    const { updateMutate } = setupHooks();
    render(<ApiKeysPage client={{} as any} entity={ownerEntity} />);

    fireEvent.click(screen.getByTestId('toggle-key-1'));

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith({
        entitySlug: 'abc12345',
        keyId: 'key-1',
        request: { is_active: false },
      });
    });
  });

  test('revokes a key only after confirmation', async () => {
    const { revokeMutate } = setupHooks();
    render(<ApiKeysPage client={{} as any} entity={ownerEntity} />);

    fireEvent.click(screen.getByTestId('revoke-key-1'));
    expect(revokeMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Revoke', { selector: 'button' }));

    await waitFor(() => {
      expect(revokeMutate).toHaveBeenCalledWith({
        entitySlug: 'abc12345',
        keyId: 'key-1',
      });
    });
  });

  test('hides every write control from a read-only member', () => {
    setupHooks();
    render(<ApiKeysPage client={{} as any} entity={memberEntity} />);

    expect(screen.getByText('CI deploy')).toBeInTheDocument();
    expect(screen.queryByText('New Key')).not.toBeInTheDocument();
    expect(screen.queryByTestId('toggle-key-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('revoke-key-1')).not.toBeInTheDocument();
  });

  test('tells a read-only member why the list is empty', () => {
    setupHooks({ keys: [] });
    render(<ApiKeysPage client={{} as any} entity={memberEntity} />);

    expect(
      screen.getByText('You need Manager or Owner access to create API keys.')
    ).toBeInTheDocument();
  });

  test('offers a retry when the list fails to load', () => {
    const { refetch } = setupHooks({ isError: true });
    render(<ApiKeysPage client={{} as any} entity={ownerEntity} />);

    fireEvent.click(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
