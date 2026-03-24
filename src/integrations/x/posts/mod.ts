/**
 * X posts module — post CRUD, search, timeline, media upload.
 *
 * @module
 */

export type {
  PostsService,
  XCreatePostOptions,
  XMediaAttachment,
  XMediaUploadResult,
  XPost,
  XPostMetrics,
  XPostPage,
  XReferencedTweet,
  XSearchOptions,
  XTimelineOptions,
  XUserPostsOptions,
} from "./types_posts.ts";

export { createPostsService } from "./posts.ts";
