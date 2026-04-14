/**
 * @fileoverview Tests for MembersManagementPage component
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
const mockUseEntityMembers = vi.fn();
const mockUseUpdateMemberRole = vi.fn();
const mockUseRemoveMember = vi.fn();
const mockUseEntityInvitations = vi.fn();
const mockUseCreateInvitation = vi.fn();
const mockUseCancelInvitation = vi.fn();

vi.mock('@sudobility/entity_client', () => ({
  EntityClient: vi.fn(),
  useEntityMembers: (...args: unknown[]) => mockUseEntityMembers(...args),
  useUpdateMemberRole: (...args: unknown[]) => mockUseUpdateMemberRole(...args),
  useRemoveMember: (...args: unknown[]) => mockUseRemoveMember(...args),
  useEntityInvitations: (...args: unknown[]) =>
    mockUseEntityInvitations(...args),
  useCreateInvitation: (...args: unknown[]) => mockUseCreateInvitation(...args),
  useCancelInvitation: (...args: unknown[]) => mockUseCancelInvitation(...args),
}));

// Mock @sudobility/entity-components
vi.mock('@sudobility/entity-components', () => ({
  MemberList: ({
    members,
    onRemove,
    onRoleChange,
    canManage,
    isLoading,
  }: {
    members: any[];
    currentUserId: string;
    onRemove?: (id: string) => void;
    onRoleChange?: (id: string, role: string) => void;
    canManage?: boolean;
    isLoading?: boolean;
  }) => (
    <div
      data-testid='member-list'
      data-loading={isLoading}
      data-can-manage={canManage}
    >
      {members.map((m: any) => (
        <div key={m.id} data-testid={`member-${m.id}`}>
          <span>{m.user?.displayName || m.userId}</span>
          {canManage && (
            <>
              <button
                data-testid={`remove-${m.id}`}
                onClick={() => onRemove?.(m.id)}
              >
                Remove
              </button>
              <button
                data-testid={`role-${m.id}`}
                onClick={() => onRoleChange?.(m.id, 'member')}
              >
                Change Role
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  ),
  InvitationForm: ({
    onSubmit,
    isSubmitting,
  }: {
    onSubmit: (req: any) => void;
    isSubmitting?: boolean;
  }) => (
    <form
      data-testid='invitation-form'
      data-submitting={isSubmitting}
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ email: 'test@example.com', role: 'member' });
      }}
    >
      <button type='submit'>Invite</button>
    </form>
  ),
  InvitationList: ({
    invitations,
    onCancel,
    isLoading,
  }: {
    invitations: any[];
    mode: string;
    onCancel?: (id: string) => void;
    isLoading?: boolean;
    emptyMessage?: string;
  }) => (
    <div data-testid='invitation-list' data-loading={isLoading}>
      {invitations.map((inv: any) => (
        <div key={inv.id} data-testid={`invitation-${inv.id}`}>
          <span>{inv.email}</span>
          {onCancel && (
            <button
              data-testid={`cancel-${inv.id}`}
              onClick={() => onCancel(inv.id)}
            >
              Cancel
            </button>
          )}
        </div>
      ))}
    </div>
  ),
}));

// Mock @sudobility/components
vi.mock('@sudobility/components', () => ({
  Section: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='section'>{children}</div>
  ),
}));

import { MembersManagementPage } from './MembersManagementPage';
import { EntityClient } from '@sudobility/entity_client';

const mockClient = {} as EntityClient;

const mockOrgEntity = {
  id: 'org-1',
  entitySlug: 'org-slug',
  entityType: 'organization' as const,
  displayName: 'Test Org',
  description: 'A test organization',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  userRole: 'owner' as const,
};

const mockPersonalEntity = {
  id: 'personal-1',
  entitySlug: 'personal-slug',
  entityType: 'personal' as const,
  displayName: 'My Workspace',
  description: null,
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  userRole: 'manager' as const,
};

const mockMembers = [
  {
    id: 'member-1',
    entityId: 'org-1',
    userId: 'user-1',
    role: 'owner',
    isActive: true,
    joinedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner User',
    },
  },
  {
    id: 'member-2',
    entityId: 'org-1',
    userId: 'user-2',
    role: 'member',
    isActive: true,
    joinedAt: '2024-01-02T00:00:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    user: {
      id: 'user-2',
      email: 'member@example.com',
      displayName: 'Member User',
    },
  },
];

const mockInvitations = [
  {
    id: 'inv-1',
    entityId: 'org-1',
    email: 'invited@example.com',
    role: 'member',
    status: 'pending',
    invitedByUserId: 'user-1',
    token: 'token-1',
    expiresAt: '2025-01-01T00:00:00Z',
    acceptedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

function setupDefaultMocks() {
  mockUseUpdateMemberRole.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseRemoveMember.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseCreateInvitation.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseCancelInvitation.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
}

describe('MembersManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('personal entity', () => {
    test('renders personal workspace notice', () => {
      mockUseEntityMembers.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockPersonalEntity as any}
          currentUserId='user-1'
        />
      );

      expect(
        screen.getByText(/personal workspaces cannot have additional members/i)
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    test('renders skeleton when members are loading', () => {
      mockUseEntityMembers.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(
        screen.getByRole('status', { name: /loading members/i })
      ).toBeInTheDocument();
    });

    test('renders skeleton when invitations are loading', () => {
      mockUseEntityMembers.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      // There should be a loading status for the invitations section
      const loadingStatuses = screen.getAllByRole('status', {
        name: /loading members/i,
      });
      expect(loadingStatuses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('error state', () => {
    test('renders member error with retry button', () => {
      const refetchFn = vi.fn();
      mockUseEntityMembers.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch members'),
        refetch: refetchFn,
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText('Failed to load members')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch members')).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole('button', { name: /retry loading members/i })
      );
      expect(refetchFn).toHaveBeenCalledTimes(1);
    });

    test('renders invitation error with retry button', () => {
      const refetchFn = vi.fn();
      mockUseEntityMembers.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch invitations'),
        refetch: refetchFn,
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(
        screen.getByText('Failed to load invitations')
      ).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole('button', { name: /retry loading invitations/i })
      );
      expect(refetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    test('renders empty member state', () => {
      mockUseEntityMembers.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText('No members yet')).toBeInTheDocument();
    });

    test('renders empty invitation state', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText('No pending invitations')).toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    test('renders members and invitations when owner', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByTestId('member-list')).toBeInTheDocument();
      expect(screen.getByTestId('invitation-list')).toBeInTheDocument();
      expect(screen.getByTestId('invitation-form')).toBeInTheDocument();
      expect(screen.getByText('Owner User')).toBeInTheDocument();
      expect(screen.getByText('Member User')).toBeInTheDocument();
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();
    });

    test('does not show invite form for non-owners', () => {
      const memberEntity = {
        ...mockOrgEntity,
        userRole: 'member' as const,
      };

      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={memberEntity as any}
          currentUserId='user-2'
        />
      );

      expect(screen.queryByTestId('invitation-form')).not.toBeInTheDocument();
    });

    test('displays member count in heading', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText('Current Members (2)')).toBeInTheDocument();
    });
  });

  describe('confirmation dialogs', () => {
    test('shows confirmation when removing a member', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(screen.getByTestId('remove-member-2'));

      expect(
        screen.getByRole('dialog', { name: /remove member/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to remove member user/i)
      ).toBeInTheDocument();
    });

    test('calls removeMember when confirmed', async () => {
      const removeFn = vi.fn().mockResolvedValue({});
      mockUseRemoveMember.mockReturnValue({
        mutateAsync: removeFn,
        isPending: false,
      });
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(screen.getByTestId('remove-member-2'));
      const dialog = screen.getByRole('dialog');
      fireEvent.click(
        within(dialog).getByRole('button', { name: /^remove$/i })
      );

      await waitFor(() => {
        expect(removeFn).toHaveBeenCalledWith({
          entitySlug: 'org-slug',
          memberId: 'member-2',
        });
      });
    });

    test('closes confirmation when cancelled', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(screen.getByTestId('remove-member-2'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('shows confirmation when cancelling an invitation', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(screen.getByTestId('cancel-inv-1'));

      expect(
        screen.getByRole('dialog', { name: /cancel invitation/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/cancel the invitation to invited@example.com/i)
      ).toBeInTheDocument();
    });

    test('calls cancelInvitation when confirmed', async () => {
      const cancelFn = vi.fn().mockResolvedValue({});
      mockUseCancelInvitation.mockReturnValue({
        mutateAsync: cancelFn,
        isPending: false,
      });
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(screen.getByTestId('cancel-inv-1'));
      fireEvent.click(
        screen.getByRole('button', { name: /cancel invitation/i })
      );

      await waitFor(() => {
        expect(cancelFn).toHaveBeenCalledWith({
          entitySlug: 'org-slug',
          invitationId: 'inv-1',
        });
      });
    });
  });

  describe('accessibility', () => {
    test('has correct ARIA landmarks', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: mockInvitations,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(
        screen.getByRole('main', { name: /members management/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: /invite members/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: /pending invitations/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: /current members/i })
      ).toBeInTheDocument();
    });

    test('confirmation dialog has proper attributes', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(screen.getByTestId('remove-member-2'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    test('closes confirmation dialog with Escape key', () => {
      mockUseEntityMembers.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseEntityInvitations.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(screen.getByTestId('remove-member-2'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
