/**
 * @fileoverview Invitations Page
 * @description Page for viewing and responding to pending invitations.
 *
 * This component uses Section internally for proper page layout.
 * Do NOT wrap this component in a Section when consuming it.
 */

import { useState } from 'react';
import { Section } from '@sudobility/components';
import { InvitationList } from '@sudobility/entity-components';
import {
  useMyInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
  EntityClient,
} from '@sudobility/entity_client';

export interface InvitationsPageProps {
  /** Entity API client */
  client: EntityClient;
  /** Callback when an invitation is accepted */
  onInvitationAccepted?: () => void;
}

/**
 * Skeleton loader for invitations while data is loading.
 */
function InvitationsSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading invitations">
      {[1, 2].map(i => (
        <div
          key={i}
          className="h-16 sm:h-20 rounded-lg bg-muted animate-pulse"
        />
      ))}
      <span className="sr-only">Loading invitations...</span>
    </div>
  );
}

/**
 * Confirmation dialog for declining an invitation.
 */
function DeclineConfirmationDialog({
  entityName,
  onConfirm,
  onCancel,
}: {
  entityName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Decline invitation"
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg bg-background p-4 sm:p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">Decline Invitation</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to decline the invitation to join{' '}
          <strong>{entityName}</strong>? You will need a new invitation to join
          later.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 w-full sm:w-auto"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Page for viewing and responding to pending invitations.
 */
export function InvitationsPage({
  client,
  onInvitationAccepted,
}: InvitationsPageProps) {
  const {
    data: invitations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useMyInvitations(client);
  const acceptInvitation = useAcceptInvitation(client);
  const declineInvitation = useDeclineInvitation(client);

  // Confirmation dialog state
  const [declineTarget, setDeclineTarget] = useState<{
    token: string;
    entityName: string;
  } | null>(null);

  const handleAccept = async (token: string) => {
    try {
      await acceptInvitation.mutateAsync(token);
      onInvitationAccepted?.();
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
    }
  };

  const handleDecline = (token: string) => {
    const invitation = invitations.find(inv => inv.token === token);
    const entityName =
      invitation?.entity?.displayName || 'this organization';
    setDeclineTarget({ token, entityName });
  };

  const handleConfirmDecline = async () => {
    if (!declineTarget) return;
    try {
      await declineInvitation.mutateAsync(declineTarget.token);
    } catch (err: any) {
      console.error('Failed to decline invitation:', err);
    }
    setDeclineTarget(null);
  };

  const pendingCount = invitations.filter(
    inv => inv.status === 'pending'
  ).length;

  return (
    <Section spacing="lg" maxWidth="4xl">
      <div role="main" aria-label="Invitations">
        {/* Decline Confirmation Dialog */}
        {declineTarget && (
          <DeclineConfirmationDialog
            entityName={declineTarget.entityName}
            onConfirm={handleConfirmDecline}
            onCancel={() => setDeclineTarget(null)}
          />
        )}

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Invitations
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {pendingCount > 0
              ? `You have ${pendingCount} pending invitation${pendingCount > 1 ? 's' : ''}`
              : 'No pending invitations'}
          </p>
        </div>

        {/* Error State */}
        {isError && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 sm:p-6 text-center mb-4 sm:mb-6"
            role="alert"
            aria-live="polite"
          >
            <p className="text-destructive font-medium mb-2">
              Failed to load invitations
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as Error)?.message || 'An unexpected error occurred'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              aria-label="Retry loading invitations"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <InvitationsSkeleton />}

        {/* Content */}
        {!isLoading && !isError && (
          <>
            {invitations.length === 0 ? (
              <div
                className="text-center py-6 sm:py-8 text-muted-foreground border border-dashed rounded-lg"
                role="status"
              >
                <p className="text-base sm:text-lg font-medium mb-1">
                  No invitations
                </p>
                <p className="text-sm">
                  {"You don't have any pending invitations"}
                </p>
              </div>
            ) : (
              <section aria-label="Invitation list">
                <div className="overflow-x-auto">
                  <InvitationList
                    invitations={invitations}
                    mode="user"
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    isLoading={isLoading}
                    emptyMessage="You don't have any pending invitations"
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
