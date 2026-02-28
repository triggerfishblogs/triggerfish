/**
 * GitHub issue operations — client, tool handlers, and tool definitions.
 *
 * @module
 */

export {
  fetchRepoIssues,
  fetchRepoIssue,
  updateRepoIssue,
  fetchIssueComments,
  submitRepoIssue,
  submitIssueComment,
} from "./client_issues.ts";

export {
  executeListIssues,
  executeGetIssue,
  executeCreateIssue,
  executeUpdateIssue,
  executeListComments,
  executeAddComment,
} from "./tools_issues.ts";

export {
  buildListIssuesDef,
  buildGetIssueDef,
  buildCreateIssueDef,
  buildUpdateIssueDef,
  buildListCommentsDef,
  buildAddCommentDef,
} from "./tools_defs_issues.ts";
