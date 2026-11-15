import { describe, expect, it } from "vitest";
import {
  DEVELOPER_MODE_CODE,
  isPlatformPermission,
  isPlatformRole,
  isUserOverridablePermission,
} from "../../src/modules/identity/settings/permissionsScope";

const permission = (code: string) => ({
  id: code,
  code,
  name: code,
  description: null,
  moduleCode: "x",
  moduleName: "X",
});

describe("identity — alcance de permisos en Workspace", () => {
  it("el modo desarrollador se puede conceder a una cuenta, pero no es un permiso de plataforma de rol", () => {
    const developer = permission(DEVELOPER_MODE_CODE);
    expect(isUserOverridablePermission(developer)).toBe(true);
    expect(isPlatformPermission(developer)).toBe(false);
  });

  it("los permisos de plataforma siguen siendo concedibles y los de una app no", () => {
    expect(isUserOverridablePermission(permission("settings.users.read"))).toBe(
      true,
    );
    expect(isUserOverridablePermission(permission("dashboard.view"))).toBe(
      true,
    );
    expect(isUserOverridablePermission(permission("brisa.access"))).toBe(false);
    expect(isUserOverridablePermission(permission("platform.owner"))).toBe(
      false,
    );
  });

  it("un rol personalizado con el modo desarrollador no pertenece al ámbito de Workspace", () => {
    expect(
      isPlatformRole({
        isSystemRole: false,
        permissions: ["settings.users.read", DEVELOPER_MODE_CODE],
      } as never),
    ).toBe(false);
  });
});
