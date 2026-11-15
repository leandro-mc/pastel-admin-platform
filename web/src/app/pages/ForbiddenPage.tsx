import { ShieldAlert } from "lucide-react";
import { strings } from "../strings";
import StatusPage from "./StatusPage";

export default function ForbiddenPage() {
  return (
    <StatusPage
      icon={ShieldAlert}
      title={strings.forbidden.title}
      message={strings.forbidden.message}
    />
  );
}

export { ForbiddenPage as Component };
