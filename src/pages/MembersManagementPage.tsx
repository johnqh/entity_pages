/**
 * @fileoverview Members Management Page
 * @description Page container for an entity's members list.
 *
 * Shows the members list in a ContentLayout. The header carries the title and
 * an "Invite" button; clicking it slides a "Invite Member" panel down from the
 * header (extending it) without leaving the page.
 *
 * Renders full-width; the consuming layout controls width and padding.
 */

import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { ui } from '@sudobility/design';
import { ContentLayout } from '@sudobility/components';
import { MemberList, InvitationForm } from '@sudobility/entity-components';
import {
  useEntityMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useCreateInvitation,
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
    <div className='space-y-3' role='status' aria-label='Loading members'>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className='h-14 sm:h-16 rounded-lg bg-muted animate-pulse'
        />
      ))}
      <span className='sr-only'>Loading members...</span>
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
      className={`fixed inset-0 z-50 flex items-center justify-center ${ui.background.overlay} p-4`}
      role='dialog'
      aria-modal='true'
      aria-label={title}
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div className='w-full max-w-sm rounded-lg bg-background p-4 sm:p-6 shadow-lg'>
        <h3 className='text-lg font-semibold mb-2'>{title}</h3>
        <p className='text-sm text-muted-foreground mb-4'>{message}</p>
        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <button
            type='button'
            onClick={onCancel}
            className='px-4 py-2 rounded-lg border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className='px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 w-full sm:w-auto'
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Page for managing an entity's members.
 */
export function MembersManagementPage({
  client,
  entity,
  currentUserId,
}: MembersManagementPageProps) {
  const canManage = entity.userRole === 'owner';

  /** Whether the slide-down "Invite Member" panel is expanded. */
  const [inviteOpen, setInviteOpen] = useState(false);

  /** Pending "remove member" confirmation, keyed by member id. */
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    label: string;
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

  // Invitations (create only — the list of sent/received invitations lives on
  // the dedicated Invitations page).
  const createInvitation = useCreateInvitation(client);

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
    const label =
      member?.user?.displayName || member?.user?.email || 'this member';
    setRemoveTarget({ id: memberId, label });
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeMember.mutateAsync({
        entitySlug: entity.entitySlug,
        memberId: removeTarget.id,
      });
    } catch (err: any) {
      console.error('Failed to remove member:', err);
    }
    setRemoveTarget(null);
  };

  const handleInvite = async (request: InviteMemberRequest) => {
    await createInvitation.mutateAsync({
      entitySlug: entity.entitySlug,
      request,
    });
    // Collapse the panel only after a successful invite; on error the form
    // stays open so the user can correct and retry.
    setInviteOpen(false);
  };

  // Personal entities don't have members to manage.
  if (entity.entityType === 'personal') {
    return (
      <ContentLayout
        header={
          <div className='border-b bg-background px-4 py-3'>
            <h1 className='text-lg sm:text-xl font-bold text-foreground'>
              Members
            </h1>
          </div>
        }
      >
        <div
          className='p-4 text-center py-8 sm:py-12 text-muted-foreground'
          role='status'
          aria-label='Personal workspace notice'
        >
          <p>Personal workspaces cannot have additional members.</p>
          <p className='mt-2'>
            Create an organization to collaborate with others.
          </p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <>
      {/* Remove-member confirmation */}
      {removeTarget && (
        <ConfirmationDialog
          title='Remove Member'
          message={`Are you sure you want to remove ${removeTarget.label}? They will lose access to this organization.`}
          confirmLabel='Remove'
          onConfirm={handleConfirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      <ContentLayout
        header={
          <div className='border-b bg-background'>
            {/* Title bar */}
            <div className='flex items-center justify-between gap-3 px-4 py-3'>
              <div className='min-w-0'>
                <h1 className='text-lg sm:text-xl font-bold text-foreground'>
                  Members
                </h1>
                <p className='text-xs sm:text-sm text-muted-foreground truncate'>
                  {members.length} member{members.length === 1 ? '' : 's'} in{' '}
                  {entity.displayName}
                </p>
              </div>
              {canManage && (
                <button
                  type='button'
                  onClick={() => setInviteOpen(open => !open)}
                  aria-expanded={inviteOpen}
                  aria-controls='invite-member-panel'
                  className='flex flex-shrink-0 items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                >
                  <PlusIcon className='h-4 w-4' aria-hidden='true' />
                  <span>Invite</span>
                </button>
              )}
            </div>

            {/* Slide-down Invite Member panel (extends the header) */}
            {canManage && (
              <div
                id='invite-member-panel'
                aria-hidden={!inviteOpen}
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  inviteOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className='overflow-hidden'>
                  <div className='border-t px-4 py-3 sm:py-4'>
                    <h2 className='text-sm font-semibold mb-3'>
                      Invite Member
                    </h2>
                    <InvitationForm
                      onSubmit={handleInvite}
                      isSubmitting={createInvitation.isPending}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className='p-4' role='main' aria-label='Members'>
          {membersError ? (
            <div
              className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center'
              role='alert'
              aria-live='polite'
            >
              <p className='text-destructive font-medium mb-2'>
                Failed to load members
              </p>
              <p className='text-sm text-muted-foreground mb-3'>
                {(membersErrorObj as Error)?.message ||
                  'An unexpected error occurred'}
              </p>
              <button
                type='button'
                onClick={() => refetchMembers()}
                aria-label='Retry loading members'
                className='px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              >
                Retry
              </button>
            </div>
          ) : membersLoading ? (
            <MembersSkeleton />
          ) : members.length === 0 ? (
            <div
              className='text-center py-8 sm:py-12 text-muted-foreground border border-dashed rounded-lg'
              role='status'
            >
              <p>No members yet</p>
              {canManage && (
                <p className='text-sm mt-1'>
                  Use the Invite button to add members.
                </p>
              )}
            </div>
          ) : (
            <div className='overflow-x-auto'>
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
        </div>
      </ContentLayout>
    </>
  );
}
