import type { ButtonHTMLAttributes } from "react";
import {
  dangerButton,
  ghostButton,
  linkButton,
  primaryButton,
  secondaryButton,
} from "./styles";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "link";

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> & {
  variant?: ButtonVariant;
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
};

const variants: Record<ButtonVariant, string> = {
  primary: primaryButton,
  secondary: secondaryButton,
  danger: dangerButton,
  ghost: ghostButton,
  link: linkButton,
};

/** Botón nativo con variantes, foco visible y estado ocupado. */
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  loading = false,
  loadingLabel,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${variants[variant]} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? loadingLabel ?? children : children}
    </button>
  );
}
