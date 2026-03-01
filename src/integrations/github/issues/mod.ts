/**
 * GitHub issue operations — client, tool handlers, and tool definitions.
 *
 * @module
 */

export {
  fetchIssueComments,
  fetchRepoIssue,
  fetchRepoIssues,
  submitIssueComment,
  submitRepoIssue,
  updateRepoIssue,
} from "./client_issues.ts";

export {
  executeAddComment,
  executeCreateIssue,
  executeGetIssue,
  executeListComments,
  executeListIssues,
  executeUpdateIssue,
} from "./tools_issues.ts";

export {
  buildAddCommentDef,
  buildCreateIssueDef,
  buildGetIssueDef,
  buildListCommentsDef,
  buildListIssuesDef,
  buildUpdateIssueDef,
} from "./tools_defs_issues.ts";
