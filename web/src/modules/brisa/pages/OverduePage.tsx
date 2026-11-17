import { BrisaFrame } from "../components/BrisaFrame";
import { OverdueView } from "../components/OverdueView";
import { strings } from "../strings";

export function Component() {
  return (
    <BrisaFrame title={strings.overdue.title} description={strings.overdue.description}>
      <OverdueView />
    </BrisaFrame>
  );
}
