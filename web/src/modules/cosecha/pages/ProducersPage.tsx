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
  SelectField,
  StateView,
  TextField,
} from "@/core/ui";
import { useProducers, useSeasons } from "../api/queries";
import { ContactLinks } from "../components/ContactLinks";
import { Pager } from "../components/Pager";
import { QueryState } from "../components/QueryState";
import { formatKg } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import {
  pageClass,
  primaryButton,
  table,
  tableScroll,
  td,
  tdNumber,
  th,
  thNumber,
} from "../styles";

const t = strings.people.producers;

/** Lista de productores con búsqueda por nombre o teléfono y capacidad estimada de una temporada. */
export function Component() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.producersManage);
  const seasons = useSeasons();
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [seasonId, setSeasonId] = useState("");
  const [page, setPage] = useState(1);

  const season =
    seasonId || seasons.data?.find((item) => item.status === "Active")?.id || "";
  const producers = useProducers({
    page,
    pageSize: 20,
    search,
    includeArchived,
    seasonId: season,
  });

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
            <Link to={cosechaPaths.newProducer} className={primaryButton}>
              <Plus aria-hidden="true" className="size-4" />
              {t.newButton}
            </Link>
          ) : undefined
        }
      />
      <Panel>
        <form
          onSubmit={submit}
          className="grid items-end gap-3 sm:grid-cols-[minmax(14rem,1fr)_minmax(12rem,16rem)_auto]"
        >
          <TextField
            label={t.searchLabel}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <SelectField
            label={strings.common.season}
            value={season}
            onChange={(event) => {
              setPage(1);
              setSeasonId(event.target.value);
            }}
            options={(seasons.data ?? []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            placeholder={strings.common.noSeason}
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
        <QueryState query={producers}>
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
                        <th className={th}>{t.pickupPoint}</th>
                        <th className={th}>{t.phones}</th>
                        <th className={thNumber}>{t.capacityColumn}</th>
                        <th className={th}>{t.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((producer) => (
                        <tr key={producer.id}>
                          <td className={td}>
                            <Link
                              to={cosechaPaths.producer(producer.id)}
                              className="font-medium text-accent-strong underline-offset-2 hover:underline"
                            >
                              {producer.name}
                            </Link>
                          </td>
                          <td className={td}>
                            {producer.pickupPoint ?? strings.common.none}
                          </td>
                          <td className={td}>
                            <div className="flex flex-col">
                              {producer.phones.map((phone) => (
                                <ContactLinks key={phone.phone} name={producer.name} phone={phone.phone} />
                              ))}
                            </div>
                          </td>
                          <td className={tdNumber}>{formatKg(producer.capacityKg)}</td>
                          <td className={td}>
                            <Badge variant={producer.isArchived ? "neutral" : "success"}>
                              {producer.isArchived ? t.archivedBadge : t.activeBadge}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={data.page}
                  totalPages={data.totalPages}
                  onPage={setPage}
                />
              </>
            )
          }
        </QueryState>
      </Panel>
    </section>
  );
}
