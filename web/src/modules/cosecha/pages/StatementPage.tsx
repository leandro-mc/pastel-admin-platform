import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import { Badge, Button, PageHeader, Panel, StateView } from "@/core/ui";
import { useVoidPayment } from "../api/mutations";
import { useStatement } from "../api/queries";
import { QueryState } from "../components/QueryState";
import { ReasonDialog } from "../components/ReasonDialog";
import { Stat } from "../components/Stat";
import { StatusBadge, statusLabel } from "../components/StatusBadge";
import { formatCrc, formatDate, formatKg, formatPhone } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { checkboxClass, linkButton, pageClass, statGrid, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";
import { PaymentDialog } from "./settlements/PaymentDialog";

const t = strings.settlements.statement;

/** Estado de cuenta de un productor: entregas con su estado de pago, pagos y registrar o anular un pago. */
export function Component() {
  const { producerId } = useParams();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.settlementsManage);
  const notify = useNotify();
  const statement = useStatement(producerId, "");
  const voidPayment = useVoidPayment();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState<{ id: string; version: number } | null>(null);

  return (
    <QueryState query={statement}>
      {(data) => {
        const pending = data.deliveries.filter((delivery) => delivery.outstandingCrc > 0);
        const target = chosen.size > 0 ? pending.filter((delivery) => chosen.has(delivery.deliveryId)) : pending;
        const suggested = target.reduce((sum, delivery) => sum + delivery.outstandingCrc, 0);
        return (
          <section data-module="cosecha" className={pageClass}>
            <Link to={cosechaPaths.settlements} className={`${linkButton} self-start`}>
              <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
              {t.back}
            </Link>
            <PageHeader
              title={data.balance.producerName}
              description={data.balance.primaryPhone ? formatPhone(data.balance.primaryPhone) : undefined}
              actions={
                canManage ? (
                  <Button onClick={() => setPaying(true)} disabled={pending.length === 0}>
                    {t.registerButton}
                  </Button>
                ) : undefined
              }
            />
            <div className={statGrid}>
              <Stat label={t.total} value={formatCrc(data.balance.totalCrc)} />
              <Stat label={t.paid} value={formatCrc(data.balance.paidCrc)} />
              <Stat label={t.balance} value={formatCrc(data.balance.balanceCrc)} />
            </div>
            <Panel title={t.deliveries} description={canManage ? t.selectedHint : undefined}>
              {data.deliveries.length === 0 ? (
                <StateView status="empty" title={t.deliveriesEmpty} />
              ) : (
                <div className={tableScroll}>
                  <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                    <thead>
                      <tr>
                        {canManage ? (
                          <th className={th}>
                            <span className="sr-only">Elegir</span>
                          </th>
                        ) : null}
                        <th className={th}>{t.shipment}</th>
                        <th className={thNumber}>{t.accepted}</th>
                        <th className={thNumber}>{t.price}</th>
                        <th className={thNumber}>{t.amount}</th>
                        <th className={thNumber}>{t.paid_}</th>
                        <th className={thNumber}>{t.outstanding}</th>
                        <th className={th}>{t.status}</th>
                        <th className={th}>{t.expected}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deliveries.map((delivery) => (
                        <tr key={delivery.deliveryId}>
                          {canManage ? (
                            <td className={td}>
                              <input
                                type="checkbox"
                                className={checkboxClass}
                                aria-label={t.select(formatDate(delivery.shipmentDate))}
                                disabled={delivery.outstandingCrc <= 0}
                                checked={chosen.has(delivery.deliveryId)}
                                onChange={(event) =>
                                  setChosen((current) => {
                                    const next = new Set(current);
                                    if (event.target.checked) next.add(delivery.deliveryId);
                                    else next.delete(delivery.deliveryId);
                                    return next;
                                  })
                                }
                              />
                            </td>
                          ) : null}
                          <td className={td}>
                            <Link
                              to={cosechaPaths.shipment(delivery.shipmentId)}
                              className="font-medium text-accent-strong underline-offset-2 hover:underline"
                            >
                              {formatDate(delivery.shipmentDate)}
                            </Link>
                          </td>
                          <td className={tdNumber}>{formatKg(delivery.acceptedKg)}</td>
                          <td className={tdNumber}>{formatCrc(delivery.pricePerKg)}</td>
                          <td className={tdNumber}>{formatCrc(delivery.amountCrc)}</td>
                          <td className={tdNumber}>{formatCrc(delivery.paidCrc)}</td>
                          <td className={tdNumber}>{formatCrc(delivery.outstandingCrc)}</td>
                          <td className={td}>
                            <StatusBadge kind="settlement" value={delivery.status} />
                          </td>
                          <td className={td}>{formatDate(delivery.expectedPaymentDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <Panel title={t.payments}>
              {data.payments.length === 0 ? (
                <p className="text-sm text-muted">{t.paymentsEmpty}</p>
              ) : (
                <div className={tableScroll}>
                  <table className={table}>
                    <thead>
                      <tr>
                        <th className={th}>{t.paidOn}</th>
                        <th className={thNumber}>{t.amount}</th>
                        <th className={th}>{t.method}</th>
                        <th className={th}>{t.reference}</th>
                        <th className={th}>{t.appliedTo}</th>
                        {canManage ? <th className={th} /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className={td}>{formatDate(payment.paidOn)}</td>
                          <td className={`${tdNumber} ${payment.isVoided ? "line-through" : ""}`}>
                            {formatCrc(payment.amountCrc)}
                          </td>
                          <td className={td}>{statusLabel("method", payment.method)}</td>
                          <td className={td}>{payment.reference ?? strings.common.none}</td>
                          <td className={td}>
                            {payment.isVoided ? (
                              <Badge variant="danger">{t.voidedReason(payment.voidReason)}</Badge>
                            ) : (
                              t.deliveriesCount(payment.allocations.length)
                            )}
                          </td>
                          {canManage ? (
                            <td className={td}>
                              {payment.isVoided ? null : (
                                <Button variant="link" onClick={() => setVoiding({ id: payment.id, version: payment.version })}>
                                  {t.void}
                                </Button>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            {paying && producerId ? (
              <PaymentDialog
                producerId={producerId}
                producerName={data.balance.producerName}
                deliveryIds={[...chosen]}
                suggestedCrc={suggested}
                onClose={() => {
                  setPaying(false);
                  setChosen(new Set());
                }}
              />
            ) : null}
            {voiding ? (
              <ReasonDialog
                title={strings.settlements.voidDialog.title}
                message={strings.settlements.voidDialog.message}
                label={strings.settlements.voidDialog.reason}
                confirmLabel={strings.settlements.voidDialog.confirm}
                pending={voidPayment.isPending}
                error={voidPayment.error}
                onClose={() => setVoiding(null)}
                onConfirm={(reason) =>
                  voidPayment.mutate(
                    { id: voiding.id, reason, version: voiding.version },
                    {
                      onSuccess: () => {
                        notify(strings.settlements.voidDialog.done);
                        setVoiding(null);
                      },
                    },
                  )
                }
              />
            ) : null}
          </section>
        );
      }}
    </QueryState>
  );
}
