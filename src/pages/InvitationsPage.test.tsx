/**
 * @fileoverview Tests for InvitationsPage component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock @sudobility/entity_client hooks
const mockUseMyInvitations = vi.fn();
const mockUseAcceptInvitation = vi.fn();
const mockUseDeclineInvitation = vi.fn();

vi.mock('@sudobility/entity_client', () => ({
  EntityClient: vi.fn(),
  useMyInvitations: (...args: unknown[]) => mockUseMyInvitations(...args),
  useAcceptInvitation: (...args: unknown[]) => mockUseAcceptInvitation(...args),
  useDeclineInvitation: (...args: unknown[]) =>
    mockUseDeclineInvitation(...args),
}));

// Mock @sudobility/entity-components
vi.mock('@sudobility/entity-components', () => ({
  InvitationList: ({
    invitations,
    onAccept,
    onDecline,
    isLoading,
  }: {
    invitations: any[];
    mode: string;
    onAccept?: (token: string) => void;
    onDecline?: (token: string) => void;
    isLoading?: boolean;
    emptyMessage?: string;
  }) => (
    <div data-testid='invitation-list' data-loading={isLoading}>
      {invitations.map((inv: any) => (
        <div key={inv.id} data-testid={`invitation-${inv.id}`}>
          <span>{inv.entity?.displayName || inv.email}</span>
          <span data-testid={`status-${inv.id}`}>{inv.status}</span>
          {onAccept && (
            <button
              data-testid={`accept-${inv.id}`}
              onClick={() => onAccept(inv.token)}
            >
              Accept
            </button>
          )}
          {onDecline && (
            <button
              data-testid={`decline-${inv.id}`}
              onClick={() => onDecline(inv.token)}
            >
              Decline
            </button>
          )}
        </div>
      ))}
    </div>
  ),
}));

import { InvitationsPage } from './InvitationsPage';
import { EntityClient } from '@sudobility/entity_client';

const mockClient = {} as EntityClient;

const mockInvitations = [
  {
    id: 'inv-1',
    entityId: 'org-1',
    email: 'user@example.com',
    role: 'member',
    status: 'pending',
    invitedByUserId: 'owner-1',
    token: 'token-abc',
    expiresAt: '2025-06-01T00:00:00Z',
    acceptedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    entity: {
      id: 'org-1',
      entitySlug: 'org-slug',
      entityType: 'organization',
      displayName: 'Test Org',
      description: null,
      avatarUrl: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    invitedBy: {
      id: 'owner-1',
      email: 'owner@example.com',
      displayName: 'Org Owner',
    },
  },
  {
    id: 'inv-2',
    entityId: 'org-2',
    email: 'user@example.com',
    role: 'manager',
    status: 'pending',
    invitedByUserId: 'owner-2',
    token: 'token-def',
    expiresAt: '2025-06-01T00:00:00Z',
    acceptedAt: null,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    entity: {
      id: 'org-2',
      entitySlug: 'org-slug-2',
      entityType: 'organization',
      displayName: 'Another Org',
      description: null,
      avatarUrl: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    invitedBy: {
      id: 'owner-2',
      email: 'owner2@example.com',
      displayName: 'Another Owner',
    },
  },
];

describe('InvitationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAcceptInvitation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeclineInvitation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  describe('loading state', () => {
    test('renders skeleton loader when loading', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(
        screen.getByRole('status', { name: /loading invitations/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Loading invitations...')).toBeInTheDocument();
    });

    test('does not render invitation list while loading', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(screen.queryByTestId('invitation-list')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    test('renders error message and retry button', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(
        screen.getByText('Failed to load invitations')
      ).toBeInTheDocument();
      expect(screen.getByText('Server error')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });

    test('calls refetch when retry button is clicked', () => {
      const refetchFn = vi.fn();
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: refetchFn,
      });

      render(<InvitationsPage client={mockClient} />);
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      expect(refetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    test('renders empty state when no invitations exist', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(screen.getByText('No invitations')).toBeInTheDocument();
      expect(
        screen.getByText("You don't have any pending invitations")
      ).toBeInTheDocument();
    });

    test('header shows no pending invitations message', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(screen.getByText('No pending invitations')).toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    test('renders invitations list', () => {
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(screen.getByTestId('invitation-list')).toBeInTheDocument();
      expect(screen.getByText('Test Org')).toBeInTheDocument();
      expect(screen.getByText('Another Org')).toBeInTheDocument();
    });

    test('header shows correct pending count', () => {
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(
        screen.getByText('You have 2 pending invitations')
      ).toBeInTheDocument();
    });

    test('header shows singular for one pending', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [mockInvitations[0]],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(
        screen.getByText('You have 1 pending invitation')
      ).toBeInTheDocument();
    });

    test('calls accept handler when accepting', async () => {
      const acceptFn = vi.fn().mockResolvedValue({});
      const onAccepted = vi.fn();
      mockUseAcceptInvitation.mockReturnValue({
        mutateAsync: acceptFn,
        isPending: false,
      });
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <InvitationsPage
          client={mockClient}
          onInvitationAccepted={onAccepted}
        />
      );

      fireEvent.click(screen.getByTestId('accept-inv-1'));

      await waitFor(() => {
        expect(acceptFn).toHaveBeenCalledWith('token-abc');
        expect(onAccepted).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('confirmation dialogs', () => {
    test('shows confirmation when declining an invitation', () => {
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      fireEvent.click(screen.getByTestId('decline-inv-1'));

      const dialog = screen.getByRole('dialog', {
        name: /decline invitation/i,
      });
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getByText(/decline the invitation to join/i)
      ).toBeInTheDocument();
      expect(within(dialog).getByText('Test Org')).toBeInTheDocument();
    });

    test('calls decline handler when confirmed', async () => {
      const declineFn = vi.fn().mockResolvedValue({});
      mockUseDeclineInvitation.mockReturnValue({
        mutateAsync: declineFn,
        isPending: false,
      });
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      fireEvent.click(screen.getByTestId('decline-inv-1'));
      const dialog = screen.getByRole('dialog');
      fireEvent.click(
        within(dialog).getByRole('button', { name: /^decline$/i })
      );

      await waitFor(() => {
        expect(declineFn).toHaveBeenCalledWith('token-abc');
      });
    });

    test('closes confirmation when cancelled', () => {
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      fireEvent.click(screen.getByTestId('decline-inv-1'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /keep/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('closes confirmation with Escape key', () => {
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      fireEvent.click(screen.getByTestId('decline-inv-1'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('has correct ARIA landmarks', () => {
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(
        screen.getByRole('main', { name: /invitations/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: /invitation list/i })
      ).toBeInTheDocument();
    });

    test('error state has alert role', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Test error'),
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('empty state has status role', () => {
      mockUseMyInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('decline confirmation dialog has proper attributes', () => {
      mockUseMyInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<InvitationsPage client={mockClient} />);

      fireEvent.click(screen.getByTestId('decline-inv-1'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Decline invitation');
    });
  });
});
