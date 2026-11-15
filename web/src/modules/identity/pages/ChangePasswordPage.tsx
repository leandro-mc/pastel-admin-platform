import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { api, isApiError } from "@/core/api";
import { useAuth, useAuthOptions } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import { routes } from "@/core/routes";
import { FormAlert } from "../components/FormAlert";
import { TextField } from "../components/TextField";
import { describeError, type ShownError } from "../errors";
import { identityStrings } from "../strings";
import { card, primaryButton, secondaryButton } from "../styles";

const t = identityStrings.changePassword;
const v = identityStrings.validation;

type Values = {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
};

function buildSchema(min: number, max: number) {
  return z
    .object({
      currentPassword: z.string().min(1, t.currentRequired),
      newPassword: z
        .string()
        .min(min, v.passwordLength(min, max))
        .max(max, v.passwordLength(min, max)),
      confirmation: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmation, {
      path: ["confirmation"],
      message: t.mismatch,
    });
}

/**
 * `/cuenta/contrasena`: cambio voluntario y ruta obligatoria con contraseña temporal. Al guardar, el servidor cierra
 * todas las sesiones y borra las cookies; la persona vuelve a ingresar con la contraseña nueva.
 */
export function Component() {
  const auth = useAuth();
  const options = useAuthOptions();
  const notify = useNotify();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<ShownError | null>(null);
  const policy = options.data?.passwordPolicy;
  const forced = auth.user?.mustChangePassword ?? false;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(
      buildSchema(policy?.minLength ?? 12, policy?.maxLength ?? 128),
    ),
  });

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await api.send("POST", "/api/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      await auth.logout();
      notify(t.done, "success");
      void navigate(routes.login, { replace: true });
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        const current = error.errors.currentPassword?.[0];
        const next = error.errors.newPassword?.[0];
        if (current) setError("currentPassword", { message: current });
        if (next) setError("newPassword", { message: next });
        if (current || next) return;
      }
      setFailure(describeError(error, t.unexpected));
    }
  });

  return (
    <section className="flex justify-center p-4 sm:p-8">
      <div className={`${card} flex flex-col gap-5`}>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-fg">
            {forced ? t.forcedTitle : t.title}
          </h1>
          <p className="text-sm text-muted">
            {forced ? t.forcedSubtitle : t.subtitle}
          </p>
        </header>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <FormAlert error={failure} />
          <TextField
            label={t.current}
            type="password"
            revealable
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <TextField
            label={t.next}
            type="password"
            revealable
            autoComplete="new-password"
            hint={policy?.description}
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <TextField
            label={t.confirmation}
            type="password"
            revealable
            autoComplete="new-password"
            error={errors.confirmation?.message}
            {...register("confirmation")}
          />
          <div className="flex flex-wrap justify-end gap-3">
            {forced ? null : (
              <Link to={routes.account} className={secondaryButton}>
                {t.cancel}
              </Link>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={primaryButton}
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
