import { PageHeader, Panel } from "@/core/ui";
import { strings } from "../strings";

/** Cómo funciona Balance, en pocas palabras. */
export function Component() {
  return (
    <div data-module="balance" className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader title={strings.help.title} description={strings.help.description} />
      {strings.help.sections.map((section) => (
        <Panel key={section.title} title={section.title} headingLevel="h2">
          <p className="text-sm leading-relaxed text-fg-secondary">{section.text}</p>
        </Panel>
      ))}
    </div>
  );
}
