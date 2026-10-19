import { Navigate } from "react-router";
import { useAuth } from "@/core/auth";
import { identityPermissions, settingsPaths } from "../paths";
import { identityStrings } from "../strings";

/** `/configuracion`: lleva a la primera sección que la persona puede ver. */
export function Component() {
  const { hasPermission } = useAuth();
  const target = [
    [identityPermissions.usersRead, settingsPaths.users],
    [identityPermissions.rolesRead, settingsPaths.roles],
    [identityPermissions.modulesRead, settingsPaths.modules],
    [identityPermissions.auditRead, settingsPaths.audit],
  ].find(([permission]) => hasPermission(permission!))?.[1];

  if (target) return <Navigate to={target} replace />;
  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold text-fg">
        {identityStrings.module.name}
      </h1>
      <p role="status" className="pt-2 text-sm text-muted">
        {identityStrings.module.noSections}
      </p>
    </section>
  );
}
