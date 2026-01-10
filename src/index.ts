/**
 * @fileoverview Entity Pages Library
 * @description Page containers for entity/organization management
 *
 * @example
 * ```tsx
 * import {
 *   EntityListPage,
 *   MembersManagementPage,
 *   InvitationsPage,
 * } from '@sudobility/entity_pages';
 *
 * function WorkspacesRoute() {
 *   return (
 *     <EntityListPage
 *       client={entityClient}
 *       onSelectEntity={handleSelectEntity}
 *     />
 *   );
 * }
 * ```
 */

export {
  EntityListPage,
  type EntityListPageProps,
  MembersManagementPage,
  type MembersManagementPageProps,
  InvitationsPage,
  type InvitationsPageProps,
  EntitySubscriptionsPage,
  type EntitySubscriptionsPageProps,
  type SubscriptionProduct,
  type CurrentSubscription,
  type SubscriptionContextValue,
  type SubscriptionPageLabels,
  type SubscriptionPageFormatters,
} from './pages';
