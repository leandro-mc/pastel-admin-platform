import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/core/api";
import { identityKeys } from "./keys";
import {
  resetPasswordResultSchema,
  roleSchema,
  userRolesResultSchema,
  userSchema,
  type PermissionEffect,
} from "./schemas";

export type NewUser = {
  email: string;
  displayName: string;
  temporaryPassword: string;
  roleIds: string[];
};

export type NewRole = {
  name: string;
  description: string;
  permissionIds: string[];
};

export type UserAccessChange = {
  userId: string;
  roleIds: string[];
  /** Solo los permisos con excepción (Grant/Deny); lo que «hereda» no se envía. */
  overrides: { permissionId: string; effect: PermissionEffect }[];
  /** Verdadero si el rol Administrator queda seleccionado: no admite excepciones, así que no se envían. */
  administrator: boolean;
};

/** Cada mutación invalida lo que cambia; la pantalla no mantiene copias propias de los datos. */
function useInvalidate() {
  const client = useQueryClient();
  return (...keys: (readonly unknown[])[]) =>
    Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

export function useCreateUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (user: NewUser) =>
      api.post("/api/admin/users", userSchema, user),
    onSuccess: () => invalidate(identityKeys.usersAll, identityKeys.roles),
  });
}

/** Guarda roles y, si corresponde, excepciones individuales (en ese orden, como la pantalla anterior). */
export function useSaveUserAccess() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (change: UserAccessChange) => {
      await api.put(
        `/api/admin/users/${change.userId}/roles`,
        userRolesResultSchema,
        { roleIds: change.roleIds },
      );
      if (!change.administrator) {
        await api.send("PUT", `/api/admin/users/${change.userId}/permissions`, {
          changes: change.overrides,
        });
      }
    },
    onSettled: (_data, _error, change) =>
      invalidate(
        identityKeys.usersAll,
        identityKeys.roles,
        identityKeys.userPermissions(change.userId),
      ),
  });
}

export function useBlockUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (userId: string) =>
      api.send("POST", `/api/admin/users/${userId}/block`),
    onSuccess: () => invalidate(identityKeys.usersAll),
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (userId: string) =>
      api.send("POST", `/api/admin/users/${userId}/unblock`),
    onSuccess: () => invalidate(identityKeys.usersAll),
  });
}

export function useResetPassword() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(
        `/api/admin/users/${userId}/reset-password`,
        resetPasswordResultSchema,
      ),
    onSuccess: () => invalidate(identityKeys.usersAll),
  });
}

export function useCreateRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (role: NewRole) =>
      api.post("/api/admin/roles", roleSchema, role),
    onSuccess: () => invalidate(identityKeys.roles),
  });
}

export function useSetRolePermissions() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { roleId: string; permissionIds: string[] }) =>
      api.send("PUT", `/api/admin/roles/${input.roleId}/permissions`, {
        permissionIds: input.permissionIds,
      }),
    onSuccess: () => invalidate(identityKeys.roles, identityKeys.usersAll),
  });
}

export function useSetModuleEnabled() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { moduleId: string; isEnabled: boolean }) =>
      api.send("PATCH", `/api/admin/modules/${input.moduleId}`, {
        isEnabled: input.isEnabled,
      }),
    onSuccess: () => invalidate(identityKeys.modules),
  });
}
