import { useState, type FormEvent } from "react";
import { useNotify } from "@/core/notifications";
import { Button, Panel, StateView, TextField } from "@/core/ui";
import { useSetCapacity } from "../../api/mutations";
import { useSeasons } from "../../api/queries";
import type { ProducerDetail, Season } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { QueryState } from "../../components/QueryState";
import { fieldMessage } from "../../errors";
import { parseDecimal, toFieldText } from "../../format";
import { strings } from "../../strings";

const t = strings.people.producers;

function CapacityRow({
  producerId,
  season,
  current,
}: {
  producerId: string;
  season: Season;
  current: number | undefined;
}) {
  const notify = useNotify();
  const save = useSetCapacity();
  const [value, setValue] = useState(toFieldText(current));
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseDecimal(value);
    if (parsed === null) {
      setInvalid(strings.common.invalidNumber);
      return;
    }
    setInvalid(undefined);
    save.mutate(
      {
        producerId,
        seasonId: season.id,
        estimatedCapacityKg: parsed,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          notify(t.capacitySaved);
          setNote("");
        },
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid items-end gap-3 border-b border-line pb-4 sm:grid-cols-[minmax(10rem,1fr)_minmax(9rem,12rem)_minmax(12rem,1fr)_auto]"
    >
      <p className="pb-3 font-medium text-fg">{season.name}</p>
      <TextField
        label={t.capacityKg}
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={invalid ?? fieldMessage(save.error, "estimatedCapacityKg")}
      />
      <TextField
        label={t.capacityNote}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
      />
      <Button
        type="submit"
        variant="secondary"
        loading={save.isPending}
        loadingLabel={strings.common.saving}
      >
        {strings.common.save}
      </Button>
      <div className="sm:col-span-4">
        <FormAlert error={save.error} />
      </div>
    </form>
  );
}

/** Capacidad estimada por temporada: la base del reparto proporcional. Cada cambio queda en el registro de cambios. */
export function CapacityPanel({ producer }: { producer: ProducerDetail }) {
  const seasons = useSeasons();
  return (
    <Panel title={t.capacitiesTitle} description={t.capacitiesDescription}>
      <QueryState query={seasons}>
        {(items) =>
          items.length === 0 ? (
            <StateView status="empty" title={t.noSeasons} />
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((season) => (
                <CapacityRow
                  key={season.id}
                  producerId={producer.id}
                  season={season}
                  current={
                    producer.capacities.find((c) => c.seasonId === season.id)
                      ?.estimatedCapacityKg
                  }
                />
              ))}
            </div>
          )
        }
      </QueryState>
    </Panel>
  );
}
