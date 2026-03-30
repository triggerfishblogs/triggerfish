/**
 * GitHub client — repository, file, and commit operations.
 *
 * Facade re-exporting from client_repos_query.ts and client_repos_git.ts.
 *
 * @module
 */

export {
  createRepoBranch,
  deleteRepoBranch,
  fetchRepo,
  fetchRepoBranches,
  fetchRepoCommits,
  fetchRepoFile,
  fetchRepoReleases,
  fetchUserRepos,
} from "./client_repos_query.ts";

export { cloneRepoToPath, pullRepoAtPath } from "./client_repos_git.ts";
