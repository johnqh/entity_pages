/**
 * @fileoverview API Keys Management Page
 * @description Page container for an entity's API keys.
 *
 * Keys authenticate a caller as the entity itself -- CI jobs, scripts, and
 * service integrations that should outlive any individual member. The server
 * stores only a hash, so a newly created key's secret is shown once in a
 * one-time reveal panel and is unrecoverable afterwards.
 *
 * Write actions are gated on `canManageApiKeys`; members with read-only access
 * see the list without controls.
 *
 * Renders full-width; the consuming layout controls width and padding.
 */

import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ui } from '@sudobility/design';
import { ContentLayout } from '@sudobility/components';
import {
  useEntityApiKeys,
  useCreateApiKey,
  useUpdateApiKey,
  useRevokeApiKey,
  EntityClient,
  type EntityApiKey,
} from '@sudobility/entity_client';
import { getPermissionsForRole } from '@sudobility/types';
import type { EntityWithRole } from '@sudobility/types';

export interface ApiKeysPageProps {
  /** Entity API client */
  client: EntityClient;
  /** Entity whose keys are managed */
  entity: EntityWithRole;
}

/**
 * Skeleton loader for the key list while data is loading.
 */
function ApiKeysSkeleton() {
  return (
    <div className='space-y-3' role='status' aria-label='Loading API keys'>
      {[1, 2].map(i => (
        <div
          key={i}
          className='h-16 sm:h-20 rounded-lg bg-muted animate-pulse'
        />
      ))}
      <span className='sr-only'>Loading API keys...</span>
    </div>
  );
}

/**
 * Confirmation dialog for destructive actions.
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
 * One-time reveal of a newly created key.
 * The secret is never retrievable again, so the panel stays until dismissed.
 */
function SecretReveal({
  secret,
  onDismiss,
}: {
  secret: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      // Clipboard unavailable (insecure context or denied permission) --
      // the key stays selectable on screen, so this is not fatal.
    }
  };

  return (
    <div
      className='mb-4 rounded-lg border border-primary/50 bg-primary/5 p-4'
      role='alert'
      aria-live='polite'
    >
      <h3 className='text-sm font-semibold mb-1'>Copy your new API key</h3>
      <p className='text-xs text-muted-foreground mb-3'>
        This is the only time the key is shown. Store it somewhere safe -- it
        cannot be retrieved again.
      </p>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <code className='flex-1 min-w-0 break-all rounded bg-muted px-3 py-2 font-mono text-xs sm:text-sm'>
          {secret}
        </code>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={handleCopy}
            className='px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type='button'
            onClick={onDismiss}
            className='px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Format a timestamp for display, tolerating nulls.
 */
function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleDateString();
}

/**
 * A single API key row.
 */
function ApiKeyRow({
  apiKey,
  canManage,
  onToggleActive,
  onRevoke,
}: {
  apiKey: EntityApiKey;
  canManage: boolean;
  onToggleActive: (apiKey: EntityApiKey) => void;
  onRevoke: (apiKey: EntityApiKey) => void;
}) {
  return (
    <div
      className='rounded-lg border bg-background p-3 sm:p-4'
      data-testid={`api-key-${apiKey.id}`}
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <h3 className='font-medium truncate'>{apiKey.keyName}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                apiKey.isActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {apiKey.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className='mt-1 font-mono text-xs text-muted-foreground truncate'>
            {apiKey.keyPrefix}...
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>
            Created {formatDate(apiKey.createdAt)} - last used{' '}
            {formatDate(apiKey.lastUsedAt)}
          </p>
        </div>

        {canManage && (
          <div className='flex flex-shrink-0 items-center gap-2'>
            <button
              type='button'
              onClick={() => onToggleActive(apiKey)}
              data-testid={`toggle-${apiKey.id}`}
              className='px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            >
              {apiKey.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type='button'
              onClick={() => onRevoke(apiKey)}
              data-testid={`revoke-${apiKey.id}`}
              aria-label={`Revoke ${apiKey.keyName}`}
              className='p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2'
            >
              <TrashIcon className='h-4 w-4' aria-hidden='true' />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Page for managing an entity's API keys.
 */
export function ApiKeysPage({ client, entity }: ApiKeysPageProps) {
  const permissions = getPermissionsForRole(entity.userRole);
  const canManage = permissions.canManageApiKeys;

  /** Whether the slide-down "New Key" panel is expanded. */
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  /** Plaintext secret from the most recent create, shown once. */
  const [newSecret, setNewSecret] = useState<string | null>(null);
  /** Pending revoke confirmation. */
  const [revokeTarget, setRevokeTarget] = useState<EntityApiKey | null>(null);

  const {
    data: apiKeys = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useEntityApiKeys(client, entity.entitySlug);

  const createKey = useCreateApiKey(client);
  const updateKey = useUpdateApiKey(client);
  const revokeKey = useRevokeApiKey(client);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = keyName.trim();
    if (!name) return;

    try {
      const created = await createKey.mutateAsync({
        entitySlug: entity.entitySlug,
        request: { key_name: name },
      });
      // Collapse the panel only after a successful create; on error the form
      // stays open so the user can correct and retry.
      setNewSecret(created.key);
      setKeyName('');
      setCreateOpen(false);
    } catch (err) {
      console.error('Failed to create API key:', err);
    }
  };

  const handleToggleActive = async (apiKey: EntityApiKey) => {
    try {
      await updateKey.mutateAsync({
        entitySlug: entity.entitySlug,
        keyId: apiKey.id,
        request: { is_active: !apiKey.isActive },
      });
    } catch (err) {
      console.error('Failed to update API key:', err);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeKey.mutateAsync({
        entitySlug: entity.entitySlug,
        keyId: revokeTarget.id,
      });
    } catch (err) {
      console.error('Failed to revoke API key:', err);
    }
    setRevokeTarget(null);
  };

  return (
    <>
      {revokeTarget && (
        <ConfirmationDialog
          title='Revoke API Key'
          message={`Revoke "${revokeTarget.keyName}"? Any integration using it will stop working immediately.`}
          confirmLabel='Revoke'
          onConfirm={handleConfirmRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}

      <ContentLayout
        header={
          <div className='border-b bg-background'>
            <div className='flex items-center justify-between gap-3 px-4 py-3'>
              <div className='min-w-0'>
                <h1 className='text-lg sm:text-xl font-bold text-foreground'>
                  API Keys
                </h1>
                <p className='text-xs sm:text-sm text-muted-foreground truncate'>
                  {apiKeys.length} key{apiKeys.length === 1 ? '' : 's'} for{' '}
                  {entity.displayName}
                </p>
              </div>
              {canManage && (
                <button
                  type='button'
                  onClick={() => setCreateOpen(open => !open)}
                  aria-expanded={createOpen}
                  aria-controls='create-api-key-panel'
                  className='flex flex-shrink-0 items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                >
                  <PlusIcon className='h-4 w-4' aria-hidden='true' />
                  <span>New Key</span>
                </button>
              )}
            </div>

            {/* Slide-down create panel (extends the header) */}
            {canManage && (
              <div
                id='create-api-key-panel'
                aria-hidden={!createOpen}
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  createOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className='overflow-hidden'>
                  <form
                    onSubmit={handleCreate}
                    className='border-t px-4 py-3 sm:py-4'
                  >
                    <label
                      htmlFor='api-key-name'
                      className='block text-sm font-semibold mb-2'
                    >
                      Key name
                    </label>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <input
                        id='api-key-name'
                        type='text'
                        value={keyName}
                        onChange={e => setKeyName(e.target.value)}
                        placeholder='e.g. CI deploy'
                        maxLength={255}
                        className='flex-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary'
                      />
                      <button
                        type='submit'
                        disabled={!keyName.trim() || createKey.isPending}
                        className='px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                      >
                        {createKey.isPending ? 'Creating...' : 'Create Key'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className='p-4' role='main' aria-label='API keys'>
          {newSecret && (
            <SecretReveal
              secret={newSecret}
              onDismiss={() => setNewSecret(null)}
            />
          )}

          {isError ? (
            <div
              className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center'
              role='alert'
              aria-live='polite'
            >
              <p className='text-destructive font-medium mb-2'>
                Failed to load API keys
              </p>
              <p className='text-sm text-muted-foreground mb-3'>
                {(error as Error)?.message || 'An unexpected error occurred'}
              </p>
              <button
                type='button'
                onClick={() => refetch()}
                aria-label='Retry loading API keys'
                className='px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <ApiKeysSkeleton />
          ) : apiKeys.length === 0 ? (
            <div
              className='text-center py-8 sm:py-12 text-muted-foreground'
              role='status'
            >
              <p>No API keys yet.</p>
              <p className='mt-2 text-sm'>
                {canManage
                  ? 'Create a key to let scripts and integrations call the API as this workspace.'
                  : 'You need Manager or Owner access to create API keys.'}
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {apiKeys.map(apiKey => (
                <ApiKeyRow
                  key={apiKey.id}
                  apiKey={apiKey}
                  canManage={canManage}
                  onToggleActive={handleToggleActive}
                  onRevoke={setRevokeTarget}
                />
              ))}
            </div>
          )}
        </div>
      </ContentLayout>
    </>
  );
}
