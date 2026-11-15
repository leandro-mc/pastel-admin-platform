import { useAuth } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import { useSetModuleEnabled } from "../api/mutations";
import { useModules } from "../api/queries";
import type { ModuleSummary } from "../api/schemas";
import { describeError } from "../errors";
import { identityPermissions } from "../paths";
import { QueryState } from "./QueryState";
import { settingsStrings } from "./strings";
import { chip, chipDanger, panel } from "./styles";

const t = settingsStrings.modules;
/** El módulo de configuración no se puede desactivar (lo impide también el servidor). */
const LOCKED = "settings";

/** `/configuracion/modulos`: los módulos vienen del código; aquí solo se activan o desactivan. No hay «crear módulo». */
export function Component() {
  const { hasPermission } = useAuth();
  const notify = useNotify();
  const modules = useModules();
  const setEnabled = useSetModuleEnabled();
  const canManage = hasPermission(identityPermissions.modulesManage);

  const toggle = async (module: ModuleSummary) => {
    try {
      await setEnabled.mutateAsync({
        moduleId: module.id,
        isEnabled: !module.isEnabled,
      });
      notify(module.isEnabled ? t.disabledOk : t.enabledOk, "success");
    } catch (error) {
      notify(
        describeError(error, settingsStrings.common.saveError).message,
        "error",
      );
    }
  };

  return (
    <section aria-labelledby="modules-title" className={panel}>
      <div className="p-4">
        <h1 id="modules-title" className="text-lg font-semibold text-fg">
          {t.title}
        </h1>
        <p className="text-sm text-muted">{t.subtitle}</p>
      </div>
      <QueryState
        isPending={modules.isPending}
        error={modules.error}
        onRetry={() => void modules.refetch()}
      >
        {modules.data && modules.data.length === 0 ? (
          <p role="status" className="p-6 text-sm text-muted">
            {t.empty}
          </p>
        ) : (
          <ul className="flex flex-col">
            {modules.data?.map((module) => (
              <li
                key={module.id}
                className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-fg">
                    {module.name}{" "}
                    <span className="font-normal text-muted">
                      ({module.code})
                    </span>
                  </p>
                  {module.description ? (
                    <p className="text-sm text-muted">{module.description}</p>
                  ) : null}
                  <p className="mt-1 flex flex-wrap gap-2">
                    <span className={module.isEnabled ? chip : chipDanger}>
                      {module.isEnabled ? t.enabled : t.disabled}
                    </span>
                    {module.code === "dashboard" ||
                    module.code === "settings" ? (
                      <span className={chip}>
                        {t.permissions(module.permissions.length)}
                      </span>
                    ) : (
                      <span className={chip}>
                        Permisos administrados dentro de la app
                      </span>
                    )}
                  </p>
                </div>
                {canManage ? (
                  <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-fg">
                    <input
                      type="checkbox"
                      role="switch"
                      className="size-5 accent-accent-strong"
                      checked={module.isEnabled}
                      disabled={setEnabled.isPending || module.code === LOCKED}
                      aria-label={
                        module.isEnabled
                          ? t.toggleOff(module.name)
                          : t.toggleOn(module.name)
                      }
                      onChange={() => void toggle(module)}
                    />
                    {module.isEnabled ? t.enabled : t.disabled}
                  </label>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}
