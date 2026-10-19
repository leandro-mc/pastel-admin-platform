import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isApiError } from "@/core/api";
import { useNotify } from "@/core/notifications";
import { useCreateRole } from "../api/mutations";
import { usePermissionCatalog } from "../api/queries";
import { FormAlert } from "../components/FormAlert";
import { TextField } from "../components/TextField";
import { describeError, type ShownError } from "../errors";
import { labelClass, primaryButton, secondaryButton } from "../styles";
import { Dialog } from "./Dialog";
import { PermissionPicker } from "./PermissionPicker";
import { QueryState } from "./QueryState";
import { settingsStrings } from "./strings";

const t = settingsStrings.createRole;
const nameRule = /^[A-Za-z][A-Za-z0-9 _.-]{1,63}$/;

const schema = z.object({
  name: z
    .string()
    .trim()
    .regex(
      nameRule,
      "Use entre 2 y 64 caracteres: letras, números, espacios, punto, guion y guion bajo; debe empezar con una letra.",
    ),
  description: z
    .string()
    .trim()
    .max(500, "La descripción admite hasta 500 caracteres."),
});
type Values = z.infer<typeof schema>;

export function CreateRoleDialog({ onClose }: { onClose: () => void }) {
  const notify = useNotify();
  const catalog = usePermissionCatalog();
  const create = useCreateRole();
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [failure, setFailure] = useState<ShownError | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await create.mutateAsync({ ...values, permissionIds });
      notify(t.created, "success");
      onClose();
    } catch (error) {
      if (isApiError(error) && error.errors.name?.[0]) {
        setError("name", { message: error.errors.name[0] });
        return;
      }
      setFailure(describeError(error, settingsStrings.common.saveError));
    }
  });

  return (
    <Dialog title={t.title} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert error={failure} />
        <TextField
          label={t.name}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label={t.description}
          autoComplete="off"
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="flex flex-col gap-2">
          <p className={labelClass}>{t.permissions}</p>
          <QueryState
            isPending={catalog.isPending}
            error={catalog.error}
            onRetry={() => void catalog.refetch()}
          >
            {catalog.data ? (
              <PermissionPicker
                catalog={catalog.data}
                selected={new Set(permissionIds)}
                onChange={setPermissionIds}
              />
            ) : null}
          </QueryState>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={secondaryButton}>
            {settingsStrings.common.cancel}
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className={primaryButton}
          >
            {create.isPending
              ? settingsStrings.common.creating
              : settingsStrings.common.create}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
