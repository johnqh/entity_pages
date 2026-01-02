/**
 * @fileoverview Tests for Entity Pages module exports
 */

import { describe, test, expect } from 'bun:test';
import {
  EntityListPage,
  MembersManagementPage,
  InvitationsPage,
} from './index';

describe('entity_pages exports', () => {
  test('exports EntityListPage component', () => {
    expect(EntityListPage).toBeDefined();
    expect(typeof EntityListPage).toBe('function');
  });

  test('exports MembersManagementPage component', () => {
    expect(MembersManagementPage).toBeDefined();
    expect(typeof MembersManagementPage).toBe('function');
  });

  test('exports InvitationsPage component', () => {
    expect(InvitationsPage).toBeDefined();
    expect(typeof InvitationsPage).toBe('function');
  });
});

describe('EntityListPage', () => {
  test('is a valid React function component', () => {
    // React function components have a name property
    expect(EntityListPage.name).toBe('EntityListPage');
  });
});

describe('MembersManagementPage', () => {
  test('is a valid React function component', () => {
    expect(MembersManagementPage.name).toBe('MembersManagementPage');
  });
});

describe('InvitationsPage', () => {
  test('is a valid React function component', () => {
    expect(InvitationsPage.name).toBe('InvitationsPage');
  });
});
