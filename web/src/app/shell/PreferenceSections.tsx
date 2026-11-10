import { Check } from "lucide-react";
import { Header, MenuItem, MenuSection } from "react-aria-components";
import { usePreferences, type TextSize, type Theme } from "@/core/preferences";
import { shellStrings } from "../strings";
import { menuHeader, menuItem } from "./styles";

const { account } = shellStrings;

const themes: { id: Theme; label: string }[] = [
  { id: "light", label: account.light },
  { id: "dark", label: account.dark },
];
const sizes: { id: TextSize; label: string }[] = [
  { id: "small", label: account.small },
  { id: "normal", label: account.normal },
  { id: "large", label: account.large },
  { id: "xlarge", label: account.xlarge },
];

function Option({ label, selected }: { label: string; selected: boolean }) {
  return (
    <>
      <span className="flex-1">{label}</span>
      {selected ? (
        <Check aria-hidden="true" className="size-4 text-accent-strong" />
      ) : null}
    </>
  );
}

/** Tema y tamaño de texto: se fijan una vez, por eso viven en un menú y no como botones permanentes de la barra. */
export default function PreferenceSections() {
  const { theme, setTheme, textSize, setTextSize } = usePreferences();
  return (
    <>
      <MenuSection
        selectionMode="single"
        selectedKeys={[theme]}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next === "light" || next === "dark") setTheme(next);
        }}
      >
        <Header className={menuHeader}>
          {shellStrings.preferences.appearance}
        </Header>
        {themes.map((option) => (
          <MenuItem
            key={option.id}
            id={option.id}
            textValue={option.label}
            className={menuItem}
          >
            <Option label={option.label} selected={theme === option.id} />
          </MenuItem>
        ))}
      </MenuSection>
      <MenuSection
        selectionMode="single"
        selectedKeys={[textSize]}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (
            next === "small" ||
            next === "normal" ||
            next === "large" ||
            next === "xlarge"
          )
            setTextSize(next);
        }}
      >
        <Header className={menuHeader}>{account.textSize}</Header>
        {sizes.map((option) => (
          <MenuItem
            key={option.id}
            id={option.id}
            textValue={option.label}
            className={menuItem}
          >
            <Option label={option.label} selected={textSize === option.id} />
          </MenuItem>
        ))}
      </MenuSection>
    </>
  );
}
