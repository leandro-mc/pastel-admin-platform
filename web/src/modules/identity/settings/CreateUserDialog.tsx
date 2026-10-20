import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isApiError } from "@/core/api";
import { useAuth, useAuthOptions } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import { useCreateUser } from "../api/mutations";
import { useRoles } from "../api/queries";
import { FormAlert } from "../components/FormAlert";
import { TextField } from "../components/TextField";
import { describeError, type ShownError } from "../errors";
import { identityStrings } from "../strings";
import { labelClass, primaryButton, secondaryButton } from "../styles";
import { Dialog } from "./Dialog";
import { QueryState } from "./QueryState";
import { settingsStrings } from "./strings";

const t = settingsStrings.createUser;
const v = identityStrings.validation;

type Values = { displayName: string; email: string; temporaryPassword: string };

function buildSchema(min: number, max: number) {
  return z.object({
    displayName: z.string().trim().min(2, v.nameLength).max(100, v.nameLength),
    email: z.string().trim().min(1, v.emailRequired).email(v.emailInvalid),
    temporaryPassword: z
      .string()
      .min(min, v.passwordLength(min, max))
      .max(max, v.passwordLength(min, max)),
  });
}

/** Alta de una cuenta con contraseña temporal (debe cambiarla al ingresar) y roles iniciales. */
export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const notify = useNotify();
  const { user: actor } = useAuth();
  const actorIsOwner = actor?.roles.includes("Owner/Superuser") ?? false;
  const options = useAuthOptions();
  const roles = useRoles();
  const create = useCreateUser();
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [failure, setFailure] = useState<ShownError | null>(null);
  const policy = options.data?.passwordPolicy;
  const assignableRoles = (roles.data ?? []).filter((role) => {
    if (role.name === "Owner/Superuser") return false;
    if (role.permissions.some((code) => code === "platform.owner" || code.startsWith("huella."))) return false;
    if (!actorIsOwner && role.permissions.some((code) => code.startsWith("cosecha."))) return false;
    return true;
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(
      buildSchema(policy?.minLength ?? 12, policy?.maxLength ?? 128),
    ),
  });

  const toggle = (id: string) =>
    setRoleIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await create.mutateAsync({ ...values, roleIds });
      notify(t.created, "success");
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        let placed = false;
        for (const field of [
          "displayName",
          "email",
          "temporaryPassword",
        ] as const) {
          const message = error.errors[field]?.[0];
          if (message) {
            setError(field, { message });
            placed = true;
          }
        }
        if (placed) return;
      }
      setFailure(describeError(error, settingsStrings.common.saveError));
    }
  });

  return (
    <Dialog title={t.title} description={t.subtitle} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert error={failure} />
        <TextField
          label={t.name}
          autoComplete="off"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <TextField
          label={t.email}
          type="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label={t.password}
          type="password"
          revealable
          autoComplete="new-password"
          hint={policy?.description}
          error={errors.temporaryPassword?.message}
          {...register("temporaryPassword")}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>{t.roles}</legend>
          <QueryState
            isPending={roles.isPending}
            error={roles.error}
            onRetry={() => void roles.refetch()}
          >
            <ul className="flex flex-col">
              {assignableRoles.map((role) => (
                <li key={role.id}>
                  <label className="flex min-h-11 items-center gap-3 text-sm text-fg">
                    <input
                      type="checkbox"
                      className="size-5 accent-accent-strong"
                      checked={roleIds.includes(role.id)}
                      onChange={() => toggle(role.id)}
                    />
                    {role.name}
                  </label>
                </li>
              ))}
            </ul>
          </QueryState>
          <p className="text-xs leading-relaxed text-muted">
            Owner/Superuser y los permisos exclusivos de Huella no se asignan desde esta pantalla. El acceso a Cosecha solo puede concederlo Owner/Superuser.
          </p>
        </fieldset>
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
