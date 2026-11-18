import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "@/core/auth";
import {
  Badge,
  Button,
  CheckboxField,
  PageHeader,
  Panel,
  StateView,
  TextField,
} from "@/core/ui";
import { useBuyers } from "../api/queries";
import { ContactLinks } from "../components/ContactLinks";
import { Pager } from "../components/Pager";
import { QueryState } from "../components/QueryState";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { pageClass, primaryButton, table, tableScroll, td, th } from "../styles";

const t = strings.people.buyers;

/** Lista de compradores con búsqueda por nombre. */
export function Component() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.buyersManage);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const buyers = useBuyers({ page, pageSize: 20, search, includeArchived });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(text);
  };

  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          canManage ? (
            <Link to={cosechaPaths.newBuyer} className={primaryButton}>
              <Plus aria-hidden="true" className="size-4" />
              {t.newButton}
            </Link>
          ) : undefined
        }
      />
      <Panel>
        <form onSubmit={submit} className="grid items-end gap-3 sm:grid-cols-[minmax(14rem,1fr)_auto]">
          <TextField
            label={t.searchLabel}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button type="submit" variant="secondary">
            {strings.common.search}
          </Button>
        </form>
        <CheckboxField
          label={t.showArchived}
          checked={includeArchived}
          onChange={(event) => {
            setPage(1);
            setIncludeArchived(event.target.checked);
          }}
        />
        <QueryState query={buyers}>
          {(data) =>
            data.items.length === 0 ? (
              <StateView
                status="empty"
                title={search || includeArchived ? t.empty : t.emptyFirst}
              />
            ) : (
              <>
                <div className={tableScroll}>
                  <table className={table}>
                    <thead>
                      <tr>
                        <th className={th}>{t.name}</th>
                        <th className={th}>{t.zone}</th>
                        <th className={th}>{t.contact}</th>
                        <th className={th}>{t.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((buyer) => (
                        <tr key={buyer.id}>
                          <td className={td}>
                            <Link
                              to={cosechaPaths.buyer(buyer.id)}
                              className="font-medium text-accent-strong underline-offset-2 hover:underline"
                            >
                              {buyer.name}
                            </Link>
                          </td>
                          <td className={td}>{buyer.zone ?? strings.common.none}</td>
                          <td className={td}>
                            {buyer.primaryContact ? (
                              <>
                                {buyer.primaryContact.name}
                                {buyer.primaryContact.phone ? (
                                  <div>
                                    <ContactLinks name={buyer.primaryContact.name} phone={buyer.primaryContact.phone} />
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              strings.common.none
                            )}
                          </td>
                          <td className={td}>
                            <Badge variant={buyer.isArchived ? "neutral" : "success"}>
                              {buyer.isArchived ? t.archivedBadge : t.activeBadge}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
              </>
            )
          }
        </QueryState>
      </Panel>
    </section>
  );
}
