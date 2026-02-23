/**
 * @fileoverview Members Management Page
 * @description Page container for managing entity members and invitations.
 *
 * This component uses Section internally for proper page layout.
 * Do NOT wrap this component in a Section when consuming it.
 */

import { useState } from 'react';
import { Section } from '@sudobility/components';
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
import type {
  EntityWithRole,
  EntityRole,
  InviteMemberRequest,
} from '@sudobility/types';

export interface MembersManagementPageProps {
  /** Entity API client */
  client: EntityClient;
  /** Entity to manage */
  entity: EntityWithRole;
  /** Current user's ID */
  currentUserId: string;
}

/**
 * Skeleton loader for member list while data is loading.
 */
function MembersSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading members">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="h-14 sm:h-16 rounded-lg bg-muted animate-pulse"
        />
      ))}
      <span className="sr-only">Loading members...</span>
    </div>
  );
}

/**
 * Confirmation dialog component for destructive actions.
 */
function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg bg-background p-4 sm:p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 w-full sm:w-auto"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Page for managing entity members and invitations.
 */
export function MembersManagementPage({
  client,
  entity,
  currentUserId,
}: MembersManagementPageProps) {
  const canManage = entity.userRole === 'owner';

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'removeMember' | 'cancelInvitation';
    id: string;
    displayLabel: string;
  } | null>(null);

  // Members
  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorObj,
    refetch: refetchMembers,
  } = useEntityMembers(client, entity.entitySlug);
  const updateRole = useUpdateMemberRole(client);
  const removeMember = useRemoveMember(client);

  // Invitations
  const {
    data: invitations = [],
    isLoading: invitationsLoading,
    isError: invitationsError,
    error: invitationsErrorObj,
    refetch: refetchInvitations,
  } = useEntityInvitations(client, canManage ? entity.entitySlug : null);
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
    }
  };

  const handleRemoveMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    const displayLabel =
      member?.user?.displayName || member?.user?.email || 'this member';
    setConfirmAction({
      type: 'removeMember',
      id: memberId,
      displayLabel,
    });
  };

  const handleConfirmRemoveMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync({
        entitySlug: entity.entitySlug,
        memberId,
      });
    } catch (err: any) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleInvite = async (request: InviteMemberRequest) => {
    await createInvitation.mutateAsync({
      entitySlug: entity.entitySlug,
      request,
    });
  };

  const handleCancelInvitation = (invitationId: string) => {
    const invitation = invitations.find(inv => inv.id === invitationId);
    const displayLabel = invitation?.email || 'this invitation';
    setConfirmAction({
      type: 'cancelInvitation',
      id: invitationId,
      displayLabel,
    });
  };

  const handleConfirmCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync({
        entitySlug: entity.entitySlug,
        invitationId,
      });
    } catch (err: any) {
      console.error('Failed to cancel invitation:', err);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'removeMember') {
      await handleConfirmRemoveMember(confirmAction.id);
    } else if (confirmAction.type === 'cancelInvitation') {
      await handleConfirmCancelInvitation(confirmAction.id);
    }
    setConfirmAction(null);
  };

  // Personal entities don't have members to manage
  if (entity.entityType === 'personal') {
    return (
      <Section spacing="lg" maxWidth="4xl">
        <div
          className="text-center py-8 sm:py-12 text-muted-foreground"
          role="status"
          aria-label="Personal workspace notice"
        >
          <p>Personal workspaces cannot have additional members.</p>
          <p className="mt-2">
            Create an organization to collaborate with others.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section spacing="lg" maxWidth="4xl">
      <div role="main" aria-label="Members management">
        {/* Confirmation Dialog */}
        {confirmAction && (
          <ConfirmationDialog
            title={
              confirmAction.type === 'removeMember'
                ? 'Remove Member'
                : 'Cancel Invitation'
            }
            message={
              confirmAction.type === 'removeMember'
                ? `Are you sure you want to remove ${confirmAction.displayLabel}? They will lose access to this organization.`
                : `Are you sure you want to cancel the invitation to ${confirmAction.displayLabel}?`
            }
            confirmLabel={
              confirmAction.type === 'removeMember' ? 'Remove' : 'Cancel Invitation'
            }
            onConfirm={handleConfirmAction}
            onCancel={() => setConfirmAction(null)}
          />
        )}

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Members
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage members and invitations for {entity.displayName}
          </p>
        </div>

        {/* Invite Form */}
        {canManage && (
          <section
            className="rounded-lg border p-3 sm:p-4 mb-6 sm:mb-8"
            aria-label="Invite members"
          >
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
              Invite Members
            </h2>
            <InvitationForm
              onSubmit={handleInvite}
              isSubmitting={createInvitation.isPending}
            />
          </section>
        )}

        {/* Pending Invitations */}
        {canManage && (
          <section className="mb-6 sm:mb-8" aria-label="Pending invitations">
            <h2 className="text-base sm:text-lg font-semibold mb-3">
              Pending Invitations
            </h2>
            {invitationsError ? (
              <div
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center"
                role="alert"
                aria-live="polite"
              >
                <p className="text-destructive font-medium mb-2">
                  Failed to load invitations
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {(invitationsErrorObj as Error)?.message ||
                    'An unexpected error occurred'}
                </p>
                <button
                  type="button"
                  onClick={() => refetchInvitations()}
                  aria-label="Retry loading invitations"
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Retry
                </button>
              </div>
            ) : invitationsLoading ? (
              <MembersSkeleton />
            ) : invitations.length === 0 ? (
              <div
                className="text-center py-4 sm:py-6 text-muted-foreground border border-dashed rounded-lg"
                role="status"
              >
                <p>No pending invitations</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <InvitationList
                  invitations={invitations}
                  mode="admin"
                  onCancel={handleCancelInvitation}
                  isLoading={invitationsLoading}
                  emptyMessage="No pending invitations"
                />
              </div>
            )}
          </section>
        )}

        {/* Current Members */}
        <section aria-label="Current members">
          <h2 className="text-base sm:text-lg font-semibold mb-3">
            Current Members ({members.length})
          </h2>
          {membersError ? (
            <div
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center"
              role="alert"
              aria-live="polite"
            >
              <p className="text-destructive font-medium mb-2">
                Failed to load members
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {(membersErrorObj as Error)?.message ||
                  'An unexpected error occurred'}
              </p>
              <button
                type="button"
                onClick={() => refetchMembers()}
                aria-label="Retry loading members"
                className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          ) : membersLoading ? (
            <MembersSkeleton />
          ) : members.length === 0 ? (
            <div
              className="text-center py-4 sm:py-6 text-muted-foreground border border-dashed rounded-lg"
              role="status"
            >
              <p>No members yet</p>
              {canManage && (
                <p className="text-sm mt-1">
                  Use the invite form above to add members.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <MemberList
                members={members}
                currentUserId={currentUserId}
                canManage={canManage}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveMember}
                isLoading={membersLoading}
              />
            </div>
          )}
        </section>
      </div>
    </Section>
  );
}
