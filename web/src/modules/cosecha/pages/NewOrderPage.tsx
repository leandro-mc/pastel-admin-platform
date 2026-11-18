import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useNotify } from "@/core/notifications";
import { PageHeader, Panel } from "@/core/ui";
import { cosechaPaths } from "../paths";
import { strings } from "../strings";
import { linkButton, pageClass } from "../styles";
import { OrderForm } from "./orders/OrderForm";

const t = strings.orders;

/** Alta de un pedido (`/pedidos/nuevo`). */
export function Component() {
  const navigate = useNavigate();
  const notify = useNotify();
  return (
    <section data-module="cosecha" className={pageClass}>
      <Link to={cosechaPaths.orders} className={`${linkButton} self-start`}>
        <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
        {t.detail.back}
      </Link>
      <PageHeader title={t.newTitle} />
      <Panel>
        <OrderForm
          onDone={(created) => {
            notify(t.form.created);
            void navigate(cosechaPaths.order(created.summary.id));
          }}
          onCancel={() => void navigate(cosechaPaths.orders)}
        />
      </Panel>
    </section>
  );
}
