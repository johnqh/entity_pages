/**
 * @fileoverview Tests for EntityListPage component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock @sudobility/entity_client
const mockUseEntities = vi.fn();
const mockUseCreateEntity = vi.fn();

vi.mock('@sudobility/entity_client', () => ({
  EntityClient: vi.fn(),
  useEntities: (...args: unknown[]) => mockUseEntities(...args),
  useCreateEntity: (...args: unknown[]) => mockUseCreateEntity(...args),
}));

// Mock @sudobility/entity-components
vi.mock('@sudobility/entity-components', () => ({
  EntityList: ({
    entities,
    onSelect,
    isLoading,
  }: {
    entities: unknown[];
    onSelect?: (entity: unknown) => void;
    isLoading?: boolean;
  }) => (
    <div data-testid='entity-list' data-loading={isLoading}>
      {(entities as any[]).map((e: any) => (
        <button
          key={e.id}
          onClick={() => onSelect?.(e)}
          data-testid={`entity-${e.id}`}
        >
          {e.displayName}
        </button>
      ))}
    </div>
  ),
}));

// Mock @heroicons/react
vi.mock('@heroicons/react/24/outline', () => ({
  PlusIcon: ({ className }: { className?: string }) => (
    <svg data-testid='plus-icon' className={className} />
  ),
}));

import { EntityListPage } from './EntityListPage';
import { EntityClient } from '@sudobility/entity_client';

const mockClient = {} as EntityClient;

const mockPersonalEntity = {
  id: 'personal-1',
  entitySlug: 'personal-slug',
  entityType: 'personal',
  displayName: 'My Workspace',
  description: null,
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  userRole: 'manager',
};

const mockOrgEntity = {
  id: 'org-1',
  entitySlug: 'org-slug',
  entityType: 'organization',
  displayName: 'Test Org',
  description: 'A test organization',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  userRole: 'owner',
};

describe('EntityListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateEntity.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  describe('loading state', () => {
    test('renders skeleton loader when loading', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(
        screen.getByRole('status', { name: /loading workspaces/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Loading workspaces...')).toBeInTheDocument();
    });

    test('does not render entity lists while loading', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(screen.queryByTestId('entity-list')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    test('renders error message and retry button', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(screen.getByText('Failed to load workspaces')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });

    test('calls refetch when retry button is clicked', () => {
      const refetchFn = vi.fn();
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: refetchFn,
      });

      render(<EntityListPage client={mockClient} />);
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      expect(refetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    test('renders empty state when no entities exist', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(screen.getByText('No workspaces found')).toBeInTheDocument();
    });

    test('renders empty organization state when only personal entities exist', () => {
      mockUseEntities.mockReturnValue({
        data: [mockPersonalEntity],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(screen.getByText('No organizations yet')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create your first organization/i })
      ).toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    test('renders personal and organization entity lists', () => {
      mockUseEntities.mockReturnValue({
        data: [mockPersonalEntity, mockOrgEntity],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(screen.getByText('Personal Workspace')).toBeInTheDocument();
      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getAllByTestId('entity-list')).toHaveLength(2);
    });

    test('calls onSelectEntity when an entity is selected', () => {
      const onSelect = vi.fn();
      mockUseEntities.mockReturnValue({
        data: [mockOrgEntity],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} onSelectEntity={onSelect} />);

      fireEvent.click(screen.getByTestId('entity-org-1'));
      expect(onSelect).toHaveBeenCalledWith(mockOrgEntity);
    });
  });

  describe('create organization form', () => {
    test('opens create form when button is clicked', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      fireEvent.click(
        screen.getByRole('button', { name: /create new organization/i })
      );

      expect(
        screen.getByRole('dialog', { name: /create organization/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
    });

    test('submits create form with valid data', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({});
      mockUseCreateEntity.mockReturnValue({
        mutateAsync,
        isPending: false,
      });
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      fireEvent.click(
        screen.getByRole('button', { name: /create new organization/i })
      );

      fireEvent.change(screen.getByLabelText('Display Name'), {
        target: { value: 'New Org' },
      });
      fireEvent.submit(
        screen.getByRole('form', { name: /create organization form/i })
      );

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          displayName: 'New Org',
          description: undefined,
        });
      });
    });

    test('shows validation error when display name is empty', async () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      fireEvent.click(
        screen.getByRole('button', { name: /create new organization/i })
      );
      fireEvent.submit(
        screen.getByRole('form', { name: /create organization form/i })
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Display name is required'
        );
      });
    });

    test('closes form when cancel is clicked', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      fireEvent.click(
        screen.getByRole('button', { name: /create new organization/i })
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('closes form when Escape key is pressed', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      fireEvent.click(
        screen.getByRole('button', { name: /create new organization/i })
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('has correct ARIA landmarks', () => {
      mockUseEntities.mockReturnValue({
        data: [mockPersonalEntity, mockOrgEntity],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(
        screen.getByRole('main', { name: /workspaces/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: /personal workspace/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: /organizations/i })
      ).toBeInTheDocument();
    });

    test('create button has descriptive aria-label', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(
        screen.getByRole('button', { name: /create new organization/i })
      ).toBeInTheDocument();
    });

    test('form inputs have labels', () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);
      fireEvent.click(
        screen.getByRole('button', { name: /create new organization/i })
      );

      expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Description (optional)')
      ).toBeInTheDocument();
    });

    test('error alert has correct role', async () => {
      mockUseEntities.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Test error'),
        refetch: vi.fn(),
      });

      render(<EntityListPage client={mockClient} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
