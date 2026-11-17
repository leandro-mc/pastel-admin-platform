import { BrisaFrame } from "../components/BrisaFrame";
import { DeadlinesView } from "../components/DeadlinesView";
import { strings } from "../strings";

export function Component() {
  return (
    <BrisaFrame title={strings.deadlines.title} description={strings.deadlines.description}>
      <DeadlinesView />
    </BrisaFrame>
  );
}
