import {
  TextField as CoreTextField,
  type TextFieldProps as CoreTextFieldProps,
} from "@/core/ui";
import { identityStrings } from "../strings";

export type TextFieldProps = CoreTextFieldProps;

/** Wrapper de Identity: conserva los textos del módulo y delega la presentación al kit compartido. */
export function TextField(props: TextFieldProps) {
  return (
    <CoreTextField
      {...props}
      revealLabels={{
        show: identityStrings.login.showPassword,
        hide: identityStrings.login.hidePassword,
      }}
    />
  );
}
