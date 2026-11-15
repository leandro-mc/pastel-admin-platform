import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isApiError } from "@/core/api";
import { useAuth, type AuthOptions } from "@/core/auth";
import { describeError, type ShownError } from "../errors";
import { identityStrings } from "../strings";
import { primaryButton } from "../styles";
import { FormAlert } from "./FormAlert";
import { TextField } from "./TextField";

const v = identityStrings.validation;

type Values = { displayName: string; email: string; password: string };

function buildSchema(policy: AuthOptions["passwordPolicy"]) {
  return z.object({
    displayName: z.string().trim().min(2, v.nameLength).max(100, v.nameLength),
    email: z.string().trim().min(1, v.emailRequired).email(v.emailInvalid),
    password: z
      .string()
      .min(
        policy.minLength,
        v.passwordLength(policy.minLength, policy.maxLength),
      )
      .max(
        policy.maxLength,
        v.passwordLength(policy.minLength, policy.maxLength),
      ),
  });
}

/** Autorregistro con contraseña (solo si `localRegistration`). La política de contraseña viene del servidor. */
export function RegisterForm({
  policy,
  onSuccess,
}: {
  policy: AuthOptions["passwordPolicy"];
  onSuccess: () => void;
}) {
  const auth = useAuth();
  const [failure, setFailure] = useState<ShownError | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(buildSchema(policy)) });

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await auth.register(values.email, values.displayName, values.password);
      onSuccess();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        const fields = ["displayName", "email", "password"] as const;
        let placed = false;
        for (const field of fields) {
          const message = error.errors[field]?.[0];
          if (message) {
            setError(field, { message });
            placed = true;
          }
        }
        if (placed) return;
      }
      setFailure(describeError(error, identityStrings.register.unexpected));
    }
  });

  const t = identityStrings.register;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert error={failure} />
      <TextField
        label={t.name}
        autoComplete="name"
        placeholder={t.namePlaceholder}
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <TextField
        label={identityStrings.login.email}
        type="email"
        autoComplete="username"
        placeholder={identityStrings.login.emailPlaceholder}
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label={identityStrings.login.password}
        type="password"
        revealable
        autoComplete="new-password"
        hint={policy.description}
        error={errors.password?.message}
        {...register("password")}
      />
      <button type="submit" disabled={isSubmitting} className={primaryButton}>
        {isSubmitting ? t.submitting : t.submit}
      </button>
    </form>
  );
}
