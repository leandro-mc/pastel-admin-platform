import { identityStrings } from "../strings";
import { secondaryButton } from "../styles";
import { GoogleLogo } from "./GoogleLogo";

/** Navega (no usa `fetch`) al inicio del flujo de Google; el servidor valida de nuevo el `returnUrl`. */
export function GoogleButton({ returnUrl }: { returnUrl?: string }) {
  const query = returnUrl ? "?returnUrl=" + encodeURIComponent(returnUrl) : "";
  const href = "/api/auth/google/start" + query;
  return (
    <a href={href} className={`${secondaryButton} w-full`}>
      <GoogleLogo />
      {identityStrings.login.google}
    </a>
  );
}
