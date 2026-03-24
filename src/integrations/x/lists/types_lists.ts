/**
 * X list types and service interface.
 *
 * @module
 */

import type { XApiResult } from "../auth/types_auth.ts";
import type { XUser, XUserPage } from "../users/types_users.ts";

// ─── Domain Types ────────────────────────────────────────────────────────────

/** An X list. */
export interface XList {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly private: boolean;
  readonly followerCount: number;
  readonly memberCount: number;
  readonly ownerId: string;
  readonly createdAt?: string;
}

/** Paginated list of X lists. */
export interface XListPage {
  readonly lists: readonly XList[];
  readonly nextToken?: string;
}

// ─── Request Options ─────────────────────────────────────────────────────────

/** Options for creating a list. */
export interface XCreateListOptions {
  readonly name: string;
  readonly description?: string;
  readonly private?: boolean;
}

/** Options for getting list members. */
export interface XListMembersOptions {
  readonly listId: string;
  readonly maxResults?: number;
  readonly nextToken?: string;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/** Service for X list operations. */
export interface ListsService {
  /** Get lists owned by the authenticated user. */
  readonly getLists: () => Promise<XApiResult<XListPage>>;
  /** Get members of a list. */
  readonly getMembers: (
    opts: XListMembersOptions,
  ) => Promise<XApiResult<XUserPage>>;
  /** Create a new list. */
  readonly createList: (
    opts: XCreateListOptions,
  ) => Promise<XApiResult<XList>>;
  /** Add a user to a list. */
  readonly addMember: (
    listId: string,
    userId: string,
  ) => Promise<XApiResult<{ readonly isMember: boolean }>>;
  /** Remove a user from a list. */
  readonly removeMember: (
    listId: string,
    userId: string,
  ) => Promise<XApiResult<{ readonly isMember: boolean }>>;
}

// Re-export for convenience within lists module
export type { XUser, XUserPage };
