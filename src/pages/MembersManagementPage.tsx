/**
 * @fileoverview Members Management Page
 * @description Page container for managing entity members and invitations
 */

import {
  MemberList,
  InvitationForm,
  InvitationList,
} from '@sudobility/entity-components';
import {
  useEntityMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useEntityInvitations,
  useCreateInvitation,
  useCancelInvitation,
  EntityClient,
} from '@sudobility/entity_client';
import type { EntityWithRole, EntityRole, InviteMemberRequest } from '@sudobility/types';

export interface MembersManagementPageProps {
  /** Entity API client */
  client: EntityClient;
  /** Entity to manage */
  entity: EntityWithRole;
  /** Current user's ID */
  currentUserId: string;
}

/**
 * Page for managing entity members and invitations.
 */
export function MembersManagementPage({
  client,
  entity,
  currentUserId,
}: MembersManagementPageProps) {
  const canManage = entity.userRole === 'admin';

  // Members
  const { data: members = [], isLoading: membersLoading } = useEntityMembers(
    client,
    entity.entitySlug
  );
  const updateRole = useUpdateMemberRole(client);
  const removeMember = useRemoveMember(client);

  // Invitations
  const { data: invitations = [], isLoading: invitationsLoading } =
    useEntityInvitations(client, canManage ? entity.entitySlug : null);
  const createInvitation = useCreateInvitation(client);
  const cancelInvitation = useCancelInvitation(client);

  const handleRoleChange = async (memberId: string, role: EntityRole) => {
    try {
      await updateRole.mutateAsync({
        entitySlug: entity.entitySlug,
        memberId,
        role,
      });
    } catch (err: any) {
      console.error('Failed to update role:', err);
      // TODO: Show toast notification
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await removeMember.mutateAsync({
        entitySlug: entity.entitySlug,
        memberId,
      });
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      // TODO: Show toast notification
    }
  };

  const handleInvite = async (request: InviteMemberRequest) => {
    await createInvitation.mutateAsync({
      entitySlug: entity.entitySlug,
      request,
    });
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync({
        entitySlug: entity.entitySlug,
        invitationId,
      });
    } catch (err: any) {
      console.error('Failed to cancel invitation:', err);
      // TODO: Show toast notification
    }
  };

  // Personal entities don't have members to manage
  if (entity.entityType === 'personal') {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Personal workspaces cannot have additional members.</p>
        <p className="mt-2">
          Create an organization to collaborate with others.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Members</h1>
        <p className="text-muted-foreground">
          Manage members and invitations for {entity.displayName}
        </p>
      </div>

      {/* Invite Form */}
      {canManage && (
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-4">Invite Members</h2>
          <InvitationForm
            onSubmit={handleInvite}
            isSubmitting={createInvitation.isPending}
          />
        </div>
      )}

      {/* Pending Invitations */}
      {canManage && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Pending Invitations</h2>
          <InvitationList
            invitations={invitations}
            mode="admin"
            onCancel={handleCancelInvitation}
            isLoading={invitationsLoading}
            emptyMessage="No pending invitations"
          />
        </div>
      )}

      {/* Current Members */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Current Members ({members.length})
        </h2>
        <MemberList
          members={members}
          currentUserId={currentUserId}
          canManage={canManage}
          onRoleChange={handleRoleChange}
          onRemove={handleRemoveMember}
          isLoading={membersLoading}
        />
      </div>
    </div>
  );
}
