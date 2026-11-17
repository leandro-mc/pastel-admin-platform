import { BrisaFrame } from "../components/BrisaFrame";
import { ImportView } from "../components/ImportView";
import { strings } from "../strings";

export function Component() {
  return (
    <BrisaFrame title={strings.import.title} description={strings.import.description}>
      <ImportView />
    </BrisaFrame>
  );
}
