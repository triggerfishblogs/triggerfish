/**
 * Docker secret store validation: permission checks and mount point verification.
 *
 * @module
 */

export {
  isPermissionSecure,
  verifyKeyFilePermissions,
} from "./permission_check.ts";
export type { PermissionCheckResult } from "./permission_check.ts";

export { parseMountPoints, verifyMountPoint } from "./mount_check.ts";
export type { MountCheckResult } from "./mount_check.ts";
