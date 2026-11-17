import { BrisaFrame } from "../components/BrisaFrame";
import { WeekView } from "../components/WeekView";
import { strings } from "../strings";

export function Component() {
  return (
    <BrisaFrame title={strings.week.title} description={strings.subtitle}>
      <WeekView />
    </BrisaFrame>
  );
}
