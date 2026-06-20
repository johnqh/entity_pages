/**
 * @fileoverview Entity List Page
 * @description Page container for listing all user's entities.
 *
 * Renders full-width; the consuming layout controls width and padding.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { ui } from '@sudobility/design';
import { ContentLayout } from '@sudobility/components';
import { EntityList } from '@sudobility/entity-components';
import {
  useEntities,
  useCreateEntity,
  EntityClient,
} from '@sudobility/entity_client';
import type { EntityWithRole } from '@sudobility/types';

export interface EntityListPageProps {
  /** Entity API client */
  client: EntityClient;
  /** Handler for selecting an entity */
  onSelectEntity?: (entity: EntityWithRole) => void;
  /** Handler for navigating to entity settings */
  onNavigateToSettings?: (entitySlug: string) => void;
}

/**
 * Skeleton loader for entity list while data is loading.
 */
function EntityListSkeleton() {
  return (
    <div className='space-y-3' role='status' aria-label='Loading workspaces'>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className='h-16 sm:h-20 rounded-lg bg-muted animate-pulse'
        />
      ))}
      <span className='sr-only'>Loading workspaces...</span>
    </div>
  );
}

/**
 * Page for listing all user's entities with create functionality.
 */
export function EntityListPage({
  client,
  onSelectEntity,
}: EntityListPageProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    displayName: '',
    description: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    data: entities = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useEntities(client);
  const createEntity = useCreateEntity(client);

  const personalEntities = entities.filter(e => e.entityType === 'personal');
  const organizationEntities = entities.filter(
    e => e.entityType === 'organization'
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createFormData.displayName.trim()) {
      setCreateError('Display name is required');
      return;
    }

    try {
      await createEntity.mutateAsync({
        displayName: createFormData.displayName.trim(),
        description: createFormData.description.trim() || undefined,
      });
      setShowCreateForm(false);
      setCreateFormData({ displayName: '', description: '' });
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create organization');
    }
  };

  return (
    <>
      {/* Create Form Modal - portaled to body to escape stacking contexts */}
      {showCreateForm &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center ${ui.background.overlay} p-4`}
            role='dialog'
            aria-modal='true'
            aria-label='Create organization'
            onClick={e => {
              if (e.target === e.currentTarget) {
                setShowCreateForm(false);
                setCreateFormData({ displayName: '', description: '' });
                setCreateError(null);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setShowCreateForm(false);
                setCreateFormData({ displayName: '', description: '' });
                setCreateError(null);
              }
            }}
          >
            <div className='w-full max-w-md rounded-lg bg-background p-4 sm:p-6 shadow-lg'>
              <h2 className='text-lg font-semibold mb-4'>
                Create Organization
              </h2>
              <form
                onSubmit={handleCreateSubmit}
                className='space-y-4'
                aria-label='Create organization form'
              >
                <div>
                  <label
                    htmlFor='create-org-name'
                    className='block text-sm font-medium mb-1'
                  >
                    Display Name
                  </label>
                  <input
                    id='create-org-name'
                    type='text'
                    value={createFormData.displayName}
                    onChange={e =>
                      setCreateFormData(prev => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                    placeholder='My Organization'
                    aria-required='true'
                    aria-invalid={createError ? 'true' : undefined}
                    className='w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary'
                  />
                </div>
                <div>
                  <label
                    htmlFor='create-org-description'
                    className='block text-sm font-medium mb-1'
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id='create-org-description'
                    value={createFormData.description}
                    onChange={e =>
                      setCreateFormData(prev => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder='What is this organization for?'
                    rows={3}
                    className='w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y'
                  />
                </div>
                {createError && (
                  <p
                    className='text-sm text-destructive'
                    role='alert'
                    aria-live='polite'
                  >
                    {createError}
                  </p>
                )}
                <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
                  <button
                    type='button'
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateFormData({
                        displayName: '',
                        description: '',
                      });
                      setCreateError(null);
                    }}
                    className='px-4 py-2 rounded-lg border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto'
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    disabled={createEntity.isPending}
                    aria-busy={createEntity.isPending}
                    className='px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto'
                  >
                    {createEntity.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ContentLayout
        header={
          <div className='flex items-center justify-between gap-3 border-b bg-background px-4 py-3'>
            <div className='min-w-0'>
              <h1 className='text-lg sm:text-xl font-bold text-foreground'>
                Workspaces
              </h1>
              <p className='text-xs sm:text-sm text-muted-foreground truncate'>
                Manage your personal and organization workspaces
              </p>
            </div>
            <button
              type='button'
              onClick={() => setShowCreateForm(true)}
              aria-label='Create new organization'
              className='flex flex-shrink-0 items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            >
              <PlusIcon className='h-4 w-4' aria-hidden='true' />
              <span>New Organization</span>
            </button>
          </div>
        }
      >
        <div className='p-4' role='main' aria-label='Workspaces'>
          {/* Error State */}
          {isError && (
            <div
              className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 sm:p-6 text-center mb-6 sm:mb-8'
              role='alert'
              aria-live='polite'
            >
              <p className='text-destructive font-medium mb-2'>
                Failed to load workspaces
              </p>
              <p className='text-sm text-muted-foreground mb-4'>
                {(error as Error)?.message || 'An unexpected error occurred'}
              </p>
              <button
                type='button'
                onClick={() => refetch()}
                aria-label='Retry loading workspaces'
                className='px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && <EntityListSkeleton />}

          {/* Content */}
          {!isLoading && !isError && (
            <>
              {/* Personal Workspace */}
              {personalEntities.length > 0 && (
                <section
                  className='mb-6 sm:mb-8'
                  aria-label='Personal workspace'
                >
                  <h2 className='text-base sm:text-lg font-semibold mb-3'>
                    Personal Workspace
                  </h2>
                  <EntityList
                    entities={personalEntities}
                    onSelect={onSelectEntity}
                    isLoading={isLoading}
                  />
                </section>
              )}

              {/* Organizations */}
              <section aria-label='Organizations'>
                <h2 className='text-base sm:text-lg font-semibold mb-3'>
                  Organizations
                </h2>
                {organizationEntities.length === 0 ? (
                  <div
                    className='text-center py-6 sm:py-8 text-muted-foreground border border-dashed rounded-lg'
                    role='status'
                  >
                    <p>No organizations yet</p>
                    <button
                      type='button'
                      onClick={() => setShowCreateForm(true)}
                      className='mt-2 text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded'
                      aria-label='Create your first organization'
                    >
                      Create your first organization
                    </button>
                  </div>
                ) : (
                  <EntityList
                    entities={organizationEntities}
                    onSelect={onSelectEntity}
                    isLoading={isLoading}
                  />
                )}
              </section>

              {/* Empty State - No entities at all */}
              {entities.length === 0 && (
                <div
                  className='text-center py-8 sm:py-12 text-muted-foreground'
                  role='status'
                >
                  <p className='text-base sm:text-lg font-medium mb-2'>
                    No workspaces found
                  </p>
                  <p className='text-sm'>
                    Create an organization to get started.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </ContentLayout>
    </>
  );
}
