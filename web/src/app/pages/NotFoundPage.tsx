import { SearchX } from "lucide-react";
import { strings } from "../strings";
import StatusPage from "./StatusPage";

export default function NotFoundPage() {
  return (
    <StatusPage
      icon={SearchX}
      title={strings.notFound.title}
      message={strings.notFound.message}
    />
  );
}

export { NotFoundPage as Component };
