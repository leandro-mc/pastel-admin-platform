import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/core/auth";
import { describeError, type ShownError } from "../errors";
import { identityStrings } from "../strings";
import { primaryButton } from "../styles";
import { FormAlert } from "./FormAlert";
import { TextField } from "./TextField";

const v = identityStrings.validation;

const schema = z.object({
  email: z.string().trim().min(1, v.emailRequired).email(v.emailInvalid),
  password: z.string().min(1, v.passwordRequired),
});
type Values = z.infer<typeof schema>;

/** Ingreso con correo y contraseña. Al terminar llama a `onSuccess` (navegar al `returnUrl`). */
export function PasswordLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const auth = useAuth();
  const [failure, setFailure] = useState<ShownError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await auth.login(values.email, values.password);
      auth.clearSessionExpired();
      onSuccess();
    } catch (error) {
      setFailure(describeError(error, identityStrings.login.unexpected));
    }
  });

  const t = identityStrings.login;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert error={failure} />
      <TextField
        label={t.email}
        type="email"
        autoComplete="username"
        placeholder={t.emailPlaceholder}
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label={t.password}
        type="password"
        revealable
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <button type="submit" disabled={isSubmitting} className={primaryButton}>
        {isSubmitting ? t.submitting : t.submit}
      </button>
    </form>
  );
}
