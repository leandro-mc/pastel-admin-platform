import { useAuth } from "@/core/auth";
import { PageHeader, Tab, TabList, TabPanel, Tabs } from "@/core/ui";
import { cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { pageClass } from "../styles";
import { PolicyPanel } from "./settings/PolicyPanel";
import { ProductsPanel } from "./settings/ProductsPanel";
import { SeasonsPanel } from "./settings/SeasonsPanel";

const t = strings.settings;

/** Configuración del gestor: temporadas, productos y parámetros de pago y reclamos. */
export function Component() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.catalogManage);
  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader title={t.title} description={t.description} />
      <Tabs>
        <TabList aria-label={t.tabsLabel}>
          <Tab id="seasons">{t.tabs.seasons}</Tab>
          <Tab id="products">{t.tabs.products}</Tab>
          <Tab id="policy">{t.tabs.policy}</Tab>
        </TabList>
        <TabPanel id="seasons">
          <SeasonsPanel canManage={canManage} />
        </TabPanel>
        <TabPanel id="products">
          <ProductsPanel canManage={canManage} />
        </TabPanel>
        <TabPanel id="policy">
          <PolicyPanel canManage={canManage} />
        </TabPanel>
      </Tabs>
    </section>
  );
}
