import { useState, type FormEvent } from "react";
import { useNotify } from "@/core/notifications";
import {
  Badge,
  Button,
  CheckboxField,
  Dialog,
  Panel,
  StateView,
  TextField,
} from "@/core/ui";
import { useCreateProduct, useUpdateProduct } from "../../api/mutations";
import { useProducts } from "../../api/queries";
import type { Product } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { QueryState } from "../../components/QueryState";
import { fieldMessage } from "../../errors";
import { strings } from "../../strings";
import { table, tableScroll, td, th } from "../../styles";

const t = strings.settings.products;

function ProductDialog({
  product,
  onClose,
}: {
  product?: Product;
  onClose: () => void;
}) {
  const notify = useNotify();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const [name, setName] = useState(product?.name ?? "");
  const [active, setActive] = useState(product?.isActive ?? true);
  const mutation = product ? update : create;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const done = () => {
      notify(product ? t.saved : t.created);
      onClose();
    };
    const body = { name, isActive: active, version: product?.version };
    if (product) update.mutate({ id: product.id, body }, { onSuccess: done });
    else create.mutate(body, { onSuccess: done });
  };

  return (
    <Dialog title={product ? t.editTitle : t.newTitle} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldMessage(mutation.error, "name")}
          maxLength={120}
          required
        />
        {product ? (
          <CheckboxField
            label={t.active}
            description={t.activeHint}
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
        ) : null}
        <FormAlert error={mutation.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            loadingLabel={strings.common.saving}
          >
            {strings.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ProductsPanel({ canManage }: { canManage: boolean }) {
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const products = useProducts(showInactive);

  return (
    <Panel
      title={t.title}
      description={t.description}
      actions={
        canManage ? (
          <Button onClick={() => setEditing("new")}>{t.newButton}</Button>
        ) : undefined
      }
    >
      <CheckboxField
        label={t.showInactive}
        checked={showInactive}
        onChange={(event) => setShowInactive(event.target.checked)}
      />
      <QueryState query={products}>
        {(items) =>
          items.length === 0 ? (
            <StateView status="empty" title={t.empty} />
          ) : (
            <div className={tableScroll}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>{t.name}</th>
                    <th className={th}>{t.unit}</th>
                    <th className={th}>{t.status}</th>
                    {canManage ? <th className={th}>{t.actions}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <tr key={product.id}>
                      <td className={td}>{product.name}</td>
                      <td className={td}>{product.unit}</td>
                      <td className={td}>
                        <Badge variant={product.isActive ? "success" : "neutral"}>
                          {product.isActive ? t.activeBadge : t.inactiveBadge}
                        </Badge>
                      </td>
                      {canManage ? (
                        <td className={td}>
                          <Button
                            variant="link"
                            onClick={() => setEditing(product)}
                          >
                            {strings.common.edit}
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </QueryState>
      {editing ? (
        <ProductDialog
          product={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  );
}
