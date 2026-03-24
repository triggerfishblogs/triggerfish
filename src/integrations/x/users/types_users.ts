/**
 * X user types and service interface.
 *
 * @module
 */

import type { XApiResult } from "../auth/types_auth.ts";

// ─── Domain Types ────────────────────────────────────────────────────────────

/** An X user profile. */
export interface XUser {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly description?: string;
  readonly profileImageUrl?: string;
  readonly verified?: boolean;
  readonly publicMetrics?: XUserMetrics;
  readonly createdAt?: string;
  readonly location?: string;
  readonly url?: string;
  readonly protected?: boolean;
}

/** Public metrics for a user. */
export interface XUserMetrics {
  readonly followers_count: number;
  readonly following_count: number;
  readonly tweet_count: number;
  readonly listed_count: number;
}

/** Paginated list of users. */
export interface XUserPage {
  readonly users: readonly XUser[];
  readonly nextToken?: string;
}

// ─── Request Options ─────────────────────────────────────────────────────────

/** Options for listing followers or following. */
export interface XFollowListOptions {
  readonly userId: string;
  readonly maxResults?: number;
  readonly nextToken?: string;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/** Service for X user operations. */
export interface UsersService {
  /** Get a user profile by username. */
  readonly getUser: (username: string) => Promise<XApiResult<XUser>>;
  /** Get followers of a user. */
  readonly getFollowers: (
    opts: XFollowListOptions,
  ) => Promise<XApiResult<XUserPage>>;
  /** Get accounts a user follows. */
  readonly getFollowing: (
    opts: XFollowListOptions,
  ) => Promise<XApiResult<XUserPage>>;
  /** Follow a user by ID. */
  readonly follow: (
    targetUserId: string,
  ) => Promise<XApiResult<{ readonly following: boolean }>>;
  /** Unfollow a user by ID. */
  readonly unfollow: (
    targetUserId: string,
  ) => Promise<XApiResult<{ readonly following: boolean }>>;
}
