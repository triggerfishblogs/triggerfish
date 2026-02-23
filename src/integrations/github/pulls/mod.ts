/**
 * GitHub pull request operations — client, tool handlers, and tool definitions.
 *
 * @module
 */

export {
  fetchRepoPulls,
  submitRepoPullRequest,
  submitPullRequestReview,
  mergeRepoPullRequest,
} from "./client_pulls.ts";

export {
  executePullsList,
  executePullsCreate,
  executePullsReview,
  executePullsMerge,
} from "./tools_pulls.ts";

export {
  buildPullsListDef,
  buildPullsCreateDef,
  buildPullsReviewDef,
  buildPullsMergeDef,
} from "./tools_defs_pulls.ts";
