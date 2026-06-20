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
const mockUseCreateInvitation = vi.fn();

vi.mock('@sudobility/entity_client', () => ({
  EntityClient: vi.fn(),
  useEntityMembers: (...args: unknown[]) => mockUseEntityMembers(...args),
  useUpdateMemberRole: (...args: unknown[]) => mockUseUpdateMemberRole(...args),
  useRemoveMember: (...args: unknown[]) => mockUseRemoveMember(...args),
  useCreateInvitation: (...args: unknown[]) => mockUseCreateInvitation(...args),
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
      <button type='submit'>Send Invite</button>
    </form>
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
}

const membersResult = (overrides: Record<string, unknown> = {}) => ({
  data: mockMembers,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

describe('MembersManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('personal entity', () => {
    test('renders personal workspace notice', () => {
      mockUseEntityMembers.mockReturnValue(membersResult({ data: [] }));

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
      mockUseEntityMembers.mockReturnValue(
        membersResult({ data: [], isLoading: true })
      );

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
  });

  describe('error state', () => {
    test('renders member error with retry button', () => {
      const refetchFn = vi.fn();
      mockUseEntityMembers.mockReturnValue(
        membersResult({
          data: [],
          isError: true,
          error: new Error('Failed to fetch members'),
          refetch: refetchFn,
        })
      );

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
  });

  describe('empty state', () => {
    test('renders empty member state', () => {
      mockUseEntityMembers.mockReturnValue(membersResult({ data: [] }));

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText('No members yet')).toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    test('renders members when owner', () => {
      mockUseEntityMembers.mockReturnValue(membersResult());

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByTestId('member-list')).toBeInTheDocument();
      expect(screen.getByText('Owner User')).toBeInTheDocument();
      expect(screen.getByText('Member User')).toBeInTheDocument();
    });

    test('shows member count in the header', () => {
      mockUseEntityMembers.mockReturnValue(membersResult());

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText(/2 members in Test Org/i)).toBeInTheDocument();
    });
  });

  describe('invite', () => {
    test('owner sees an Invite toggle and the (collapsed) invite panel', () => {
      mockUseEntityMembers.mockReturnValue(membersResult());

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      // The toggle is the button carrying aria-expanded.
      expect(
        screen.getByRole('button', { name: /^invite$/i, expanded: false })
      ).toBeInTheDocument();
      // The form is in the DOM (panel collapsed via CSS).
      expect(screen.getByTestId('invitation-form')).toBeInTheDocument();
    });

    test('clicking Invite expands the panel', () => {
      mockUseEntityMembers.mockReturnValue(membersResult());

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.click(
        screen.getByRole('button', { name: /^invite$/i, expanded: false })
      );

      expect(
        screen.getByRole('button', { name: /^invite$/i, expanded: true })
      ).toBeInTheDocument();
    });

    test('submitting the invite form calls createInvitation', async () => {
      const inviteFn = vi.fn().mockResolvedValue({});
      mockUseCreateInvitation.mockReturnValue({
        mutateAsync: inviteFn,
        isPending: false,
      });
      mockUseEntityMembers.mockReturnValue(membersResult());

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      fireEvent.submit(screen.getByTestId('invitation-form'));

      await waitFor(() => {
        expect(inviteFn).toHaveBeenCalledWith({
          entitySlug: 'org-slug',
          request: { email: 'test@example.com', role: 'member' },
        });
      });
    });

    test('non-owners do not see the invite panel', () => {
      const memberEntity = { ...mockOrgEntity, userRole: 'member' as const };
      mockUseEntityMembers.mockReturnValue(membersResult());

      render(
        <MembersManagementPage
          client={mockClient}
          entity={memberEntity as any}
          currentUserId='user-2'
        />
      );

      expect(screen.queryByTestId('invitation-form')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^invite$/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('remove member confirmation', () => {
    test('shows confirmation when removing a member', () => {
      mockUseEntityMembers.mockReturnValue(membersResult());

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
      mockUseEntityMembers.mockReturnValue(membersResult());

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
      mockUseEntityMembers.mockReturnValue(membersResult());

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
  });

  describe('accessibility', () => {
    test('exposes the members list as a main landmark', () => {
      mockUseEntityMembers.mockReturnValue(membersResult());

      render(
        <MembersManagementPage
          client={mockClient}
          entity={mockOrgEntity as any}
          currentUserId='user-1'
        />
      );

      expect(
        screen.getByRole('main', { name: /members/i })
      ).toBeInTheDocument();
    });

    test('confirmation dialog has proper attributes', () => {
      mockUseEntityMembers.mockReturnValue(membersResult());

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
      mockUseEntityMembers.mockReturnValue(membersResult());

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
