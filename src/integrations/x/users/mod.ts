/**
 * X users module — profile lookup, followers, following, follow/unfollow.
 *
 * @module
 */

export type {
  UsersService,
  XFollowListOptions,
  XUser,
  XUserMetrics,
  XUserPage,
} from "./types_users.ts";

export { createUsersService } from "./users.ts";
