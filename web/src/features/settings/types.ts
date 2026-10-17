import type { User } from "../../types";

export type Permission = {
  id: string;
  moduleCode: string;
  moduleName: string;
  code: string;
  name: string;
  description: string | null;
  isSystemPermission: boolean;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissionIds: string[];
  permissions: string[];
  userCount: number;
};

export type Module = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
  permissions: Permission[];
};

export type Audit = {
  id: number;
  actorUserId: string | null;
  actorEmail: string | null;
  targetUserId: string | null;
  action: string;
  target: string | null;
  detailsJson: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export type Tab = "users" | "roles" | "modules" | "audit";

export type { User };

export type NewUserForm = {
  email: string;
  displayName: string;
  temporaryPassword: string;
  roleIds: string[];
};

export type NewRoleForm = {
  name: string;
  description: string;
  permissionIds: string[];
};

export type NewModuleForm = {
  code: string;
  name: string;
  description: string;
  actions: string;
};

export type PermissionGroup = {
  name: string;
  permissions: Permission[];
};

export type PermissionEffect = "Grant" | "Deny" | "Inherit";
