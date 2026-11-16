import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, PageHeader, SelectField, TextField } from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import { isApiError } from "@/core/api";
import { useCreateGroup } from "../api/mutations";
import { useCurrencies } from "../api/queries";
import { fieldError, messageFor } from "../lib/errors";
import { DEFAULT_ZONE, timeZones, todayLocal } from "../lib/timeZones";
import { strings } from "../strings";

export function Component() {
  const navigate = useNavigate();
  const currencies = useCurrencies();
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currencyCode, setCurrencyCode] = useState("CRC");
  const [timeZone, setTimeZone] = useState(DEFAULT_ZONE);
  const [startDate, setStartDate] = useState(todayLocal());
  const [nameError, setNameError] = useState<string | undefined>();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === "") {
      setNameError(strings.newGroup.nameRequired);
      return;
    }
    setNameError(undefined);
    create.mutate(
      { name: name.trim(), description: description.trim(), currencyCode, startDate, timeZone },
      { onSuccess: (created) => void navigate(`/balance/grupos/${created.id}/personas`) },
    );
  }

  const general = create.error && !(isApiError(create.error) && create.error.isValidation);

  return (
    <div data-module="balance" className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={strings.newGroup.title} description={strings.newGroup.description} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        {general ? <Alert variant="error" message={messageFor(create.error)} /> : null}
        <TextField
          label={strings.newGroup.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          autoFocus
          error={nameError ?? fieldError(create.error, "name")}
        />
        <TextField
          label={strings.newGroup.descriptionLabel}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          error={fieldError(create.error, "description")}
        />
        <SelectField
          label={strings.newGroup.currency}
          hint={strings.newGroup.currencyHint}
          value={currencyCode}
          onChange={(event) => setCurrencyCode(event.target.value)}
          error={fieldError(create.error, "currencyCode")}
          options={(currencies.data ?? [{ code: "CRC", name: "Colón costarricense", symbol: "₡", decimals: 2, featured: true }]).map((c) => ({
            value: c.code,
            label: `${c.code} · ${c.name} (${c.symbol})`,
          }))}
        />
        <SelectField
          label={strings.newGroup.timeZone}
          hint={strings.newGroup.timeZoneHint}
          value={timeZone}
          onChange={(event) => setTimeZone(event.target.value)}
          error={fieldError(create.error, "timeZone")}
          options={timeZones().map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }))}
        />
        <TextField
          label={strings.newGroup.startDate}
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={fieldError(create.error, "startDate")}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Link to="/balance" className={secondaryButton}>
            {strings.common.cancel}
          </Link>
          <Button type="submit" loading={create.isPending} loadingLabel={strings.common.saving}>
            {strings.newGroup.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
