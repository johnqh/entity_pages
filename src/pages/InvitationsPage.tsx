/**
 * @fileoverview Invitations Page
 * @description Page for viewing and responding to pending invitations
 */

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
 * Page for viewing and responding to pending invitations.
 */
export function InvitationsPage({
  client,
  onInvitationAccepted,
}: InvitationsPageProps) {
  const { data: invitations = [], isLoading } = useMyInvitations(client);
  const acceptInvitation = useAcceptInvitation(client);
  const declineInvitation = useDeclineInvitation(client);

  const handleAccept = async (token: string) => {
    try {
      await acceptInvitation.mutateAsync(token);
      onInvitationAccepted?.();
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      // TODO: Show toast notification
    }
  };

  const handleDecline = async (token: string) => {
    try {
      await declineInvitation.mutateAsync(token);
    } catch (err: any) {
      console.error('Failed to decline invitation:', err);
      // TODO: Show toast notification
    }
  };

  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invitations</h1>
        <p className="text-muted-foreground">
          {pendingCount > 0
            ? `You have ${pendingCount} pending invitation${pendingCount > 1 ? 's' : ''}`
            : 'No pending invitations'}
        </p>
      </div>

      {/* Invitations List */}
      <InvitationList
        invitations={invitations}
        mode="user"
        onAccept={handleAccept}
        onDecline={handleDecline}
        isLoading={isLoading}
        emptyMessage="You don't have any pending invitations"
      />
    </div>
  );
}
