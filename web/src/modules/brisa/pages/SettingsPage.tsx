import { BrisaFrame } from "../components/BrisaFrame";
import { SettingsView } from "../components/SettingsView";
import { strings } from "../strings";

export function Component() {
  return (
    <BrisaFrame title={strings.settings.title} description={strings.settings.description}>
      <SettingsView />
    </BrisaFrame>
  );
}
