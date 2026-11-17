import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { useAuth } from "@/core/auth";
import { Alert, PageHeader, Tab, TabList, TabPanel, Tabs } from "@/core/ui";
import { useShipment } from "../api/queries";
import type { ShipmentDetail } from "../api/schemas";
import { ChangesList } from "../components/ChangesList";
import { QueryState } from "../components/QueryState";
import { Stat } from "../components/Stat";
import { StatusBadge } from "../components/StatusBadge";
import { formatCrc, formatDate, formatKg, formatNumber } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { linkButton, pageClass, statGrid } from "../styles";
import { AllocationPanel } from "./shipments/AllocationPanel";
import { DeliveryPanel } from "./shipments/DeliveryPanel";
import { OrdersPanel } from "./shipments/OrdersPanel";
import { ReceptionPanel } from "./shipments/ReceptionPanel";
import { StatusBar } from "./shipments/StatusBar";

const t = strings.shipments.detail;

function ShipmentView({ detail }: { detail: ShipmentDetail }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.shipmentsManage);
  const { summary, totals } = detail;

  return (
    <section data-module="cosecha" className={pageClass}>
      <Link to={cosechaPaths.shipments} className={`${linkButton} self-start`}>
        <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
        {t.back}
      </Link>
      <PageHeader
        title={`Envío del ${formatDate(summary.shipmentDate)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge kind="shipment" value={summary.status} />
            <span>
              {t.season}: {summary.seasonName}
            </span>
            <span>
              {strings.shipments.plan.buffer}: {formatNumber(summary.bufferPercent)} %
            </span>
          </span>
        }
        actions={canManage ? <StatusBar detail={detail} /> : undefined}
      />
      {summary.status === "Closed" ? (
        <Alert variant="info" message={`${t.closedNotice(detail.closeReason)} ${t.closedHint}`} />
      ) : null}
      {detail.notes ? <p className="text-sm text-fg">{detail.notes}</p> : null}
      <div className={statGrid}>
        <Stat
          label={t.stats.target}
          value={formatKg(totals.targetKg)}
          hint={t.stats.targetHint(formatKg(totals.plannedKg), formatKg(totals.bufferKg))}
        />
        <Stat
          label={t.stats.requested}
          value={formatKg(totals.requestedKg)}
          hint={t.stats.requestedHint(formatKg(totals.differenceKg))}
          tone={totals.differenceKg < 0 ? "danger" : "default"}
        />
        <Stat label={t.stats.received} value={formatKg(totals.receivedKg)} hint={t.stats.accepted(formatKg(totals.acceptedKg))} />
        <Stat label={t.stats.delivered} value={formatKg(totals.deliveredKg)} />
        <Stat label={t.stats.cost} value={formatCrc(totals.producerCostCrc)} />
        <Stat label={t.stats.revenue} value={formatCrc(totals.buyerRevenueCrc)} />
        <Stat label={t.stats.margin} value={formatCrc(totals.marginCrc)} hint={t.stats.marginHint} />
      </div>
      <Tabs defaultSelectedKey={detail.deliveries.length === 0 && canManage ? "producers" : "orders"}>
        <TabList aria-label={t.tabsLabel}>
          <Tab id="orders">{t.tabs.orders}</Tab>
          <Tab id="producers">{t.tabs.producers}</Tab>
          <Tab id="reception">{t.tabs.reception}</Tab>
          <Tab id="delivery">{t.tabs.delivery}</Tab>
          <Tab id="changes">{t.tabs.changes}</Tab>
        </TabList>
        <TabPanel id="orders">
          <OrdersPanel key={summary.version} detail={detail} canManage={canManage} />
        </TabPanel>
        <TabPanel id="producers">
          <AllocationPanel detail={detail} canManage={canManage} />
        </TabPanel>
        <TabPanel id="reception">
          <ReceptionPanel detail={detail} canManage={canManage} />
        </TabPanel>
        <TabPanel id="delivery">
          <DeliveryPanel detail={detail} canManage={canManage} />
        </TabPanel>
        <TabPanel id="changes">
          <ChangesList changes={detail.changes} />
        </TabPanel>
      </Tabs>
    </section>
  );
}

/** Detalle de un envío: pedidos, reparto entre productores, recepción, entrega y registro de cambios. */
export function Component() {
  const { id } = useParams();
  const shipment = useShipment(id);
  return <QueryState query={shipment}>{(detail) => <ShipmentView detail={detail} />}</QueryState>;
}
