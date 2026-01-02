/**
 * @fileoverview Entity List Page
 * @description Page container for listing all user's entities
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
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

  const { data: entities = [], isLoading } = useEntities(client);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
          <p className="text-muted-foreground">
            Manage your personal and organization workspaces
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Organization</span>
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Create Organization</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={createFormData.displayName}
                  onChange={e =>
                    setCreateFormData(prev => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="My Organization"
                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={createFormData.description}
                  onChange={e =>
                    setCreateFormData(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What is this organization for?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateFormData({ displayName: '', description: '' });
                    setCreateError(null);
                  }}
                  className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEntity.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createEntity.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Personal Workspace */}
      {personalEntities.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Personal Workspace</h2>
          <EntityList
            entities={personalEntities}
            onSelect={onSelectEntity}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Organizations */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Organizations</h2>
        {organizationEntities.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <p>No organizations yet</p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-2 text-primary hover:underline"
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
      </div>
    </div>
  );
}
