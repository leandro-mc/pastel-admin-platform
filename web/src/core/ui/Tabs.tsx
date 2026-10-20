import type { ComponentProps } from "react";
import { Tab as AriaTab, TabList as AriaTabList, TabPanel as AriaTabPanel, Tabs as AriaTabs } from "react-aria-components";

type ClassNameProps = { className?: string };
type TabsProps = Omit<ComponentProps<typeof AriaTabs>, "className"> & ClassNameProps;
type TabListProps = Omit<ComponentProps<typeof AriaTabList>, "className"> & ClassNameProps;
type TabProps = Omit<ComponentProps<typeof AriaTab>, "className"> & ClassNameProps;
type TabPanelProps = Omit<ComponentProps<typeof AriaTabPanel>, "className"> & ClassNameProps;

/** Pestañas con navegación por teclado a través de React Aria. */
export function Tabs({ className = "", ...props }: TabsProps) {
  return <AriaTabs {...props} className={`flex min-w-0 flex-col gap-4 ${className}`.trim()} />;
}
export function TabList({ className = "", ...props }: TabListProps) {
  return <AriaTabList {...props} className={`flex gap-2 overflow-x-auto border-b border-line ${className}`.trim()} />;
}
export function Tab({ className = "", ...props }: TabProps) {
  return (
    <AriaTab
      {...props}
      className={({ isSelected }) => [
        "min-h-11 border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-strong/45",
        isSelected ? "border-accent-strong text-accent-strong" : "border-transparent text-fg-secondary hover:text-fg",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}
export function TabPanel({ className = "", ...props }: TabPanelProps) {
  return <AriaTabPanel {...props} className={`rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-strong/45 ${className}`.trim()} />;
}
