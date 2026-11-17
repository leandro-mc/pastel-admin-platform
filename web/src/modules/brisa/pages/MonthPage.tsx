import { BrisaFrame } from "../components/BrisaFrame";
import { MonthView } from "../components/MonthView";
import { strings } from "../strings";

export function Component() {
  return (
    <BrisaFrame title={strings.month.title} description={strings.month.hint}>
      <MonthView />
    </BrisaFrame>
  );
}
