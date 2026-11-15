import { Eye } from "lucide-react";
import { Button } from "react-aria-components";
import { useDevMode, NO_ROLE } from "@/core/devmode";
import { allModules } from "../modules";
import { shellStrings } from "../strings";
import { appName } from "./navigation";
import { barButton } from "./styles";

const { dev } = shellStrings;

/** Aviso permanente mientras hay una vista previa: nombra el rol y ofrece salir con un clic. */
export default function SimulationBanner() {
  const { simulating, selected, activeApp, select } = useDevMode();
  if (!simulating || !selected) return null;
  const module = allModules.find((m) => m.code === activeApp);
  const role = selected === NO_ROLE ? dev.noRole : selected;
  return (
    <div role="status" className="shell-simbanner">
      <Eye aria-hidden="true" />
      <p>
        <strong className="font-semibold">
          {dev.banner(role, module ? appName(module) : (activeApp ?? ""))}
        </strong>{" "}
        <span className="hidden text-fg-secondary md:inline">
          {dev.bannerNote}
        </span>
      </p>
      <Button className={barButton} onPress={() => select(null)}>
        {dev.exit}
      </Button>
    </div>
  );
}
