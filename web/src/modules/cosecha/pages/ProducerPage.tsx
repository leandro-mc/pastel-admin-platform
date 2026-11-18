import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import {
  Alert,
  Button,
  CheckboxField,
  ConfirmDialog,
  PageHeader,
  Panel,
  TextField,
} from "@/core/ui";
import {
  useArchiveProducer,
  useCreateProducer,
  useUpdateProducer,
} from "../api/mutations";
import { useProducer } from "../api/queries";
import type { ProducerDetail } from "../api/schemas";
import { FormAlert } from "../components/FormAlert";
import { LocationFields, parseCoordinates } from "../components/LocationFields";
import { QueryState } from "../components/QueryState";
import { fieldMessage } from "../errors";
import { formatPhone, parseDecimal, toFieldText } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { linkButton, pageClass, secondaryButton } from "../styles";
import { CapacityPanel } from "./producers/CapacityPanel";

const t = strings.people.producers;

type PhoneRow = { phone: string; label: string; isPrimary: boolean };

function ProducerForm({ producer }: { producer?: ProducerDetail }) {
  const navigate = useNavigate();
  const notify = useNotify();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.producersManage);
  const create = useCreateProducer();
  const update = useUpdateProducer();
  const archive = useArchiveProducer();
  const mutation = producer ? update : create;

  const [name, setName] = useState(producer?.name ?? "");
  const [pickupPoint, setPickupPoint] = useState(producer?.pickupPoint ?? "");
  const [notes, setNotes] = useState(producer?.notes ?? "");
  const [latitude, setLatitude] = useState(toFieldText(producer?.latitude));
  const [longitude, setLongitude] = useState(toFieldText(producer?.longitude));
  const [mapUrl, setMapUrl] = useState(producer?.mapUrl ?? "");
  const [phones, setPhones] = useState<PhoneRow[]>(
    producer && producer.phones.length > 0
      ? producer.phones.map((p) => ({
          phone: formatPhone(p.phone),
          label: p.label ?? "",
          isPrimary: p.isPrimary,
        }))
      : [{ phone: "", label: "", isPrimary: true }],
  );
  const [coordinatesError, setCoordinatesError] = useState<string>();
  const [archiving, setArchiving] = useState(false);

  const setPhone = (index: number, patch: Partial<PhoneRow>) =>
    setPhones((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const makePrimary = (index: number) =>
    setPhones((rows) => rows.map((row, i) => ({ ...row, isPrimary: i === index })));
  const removePhone = (index: number) =>
    setPhones((rows) => rows.filter((_, i) => i !== index));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const coords = parseCoordinates(latitude, longitude, parseDecimal);
    if (coords.invalid) {
      setCoordinatesError(strings.common.invalidNumber);
      return;
    }
    setCoordinatesError(undefined);
    const body = {
      name,
      pickupPoint: pickupPoint.trim() || undefined,
      latitude: coords.latitude,
      longitude: coords.longitude,
      mapUrl: mapUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      userId: producer?.userId ?? null,
      phones: phones
        .filter((row) => row.phone.trim() !== "")
        .map((row) => ({
          phone: row.phone,
          label: row.label.trim() || undefined,
          isPrimary: row.isPrimary,
        })),
      version: producer?.version,
    };
    if (producer) {
      update.mutate(
        { id: producer.id, body },
        { onSuccess: () => notify(t.saved) },
      );
    } else {
      create.mutate(body, {
        onSuccess: (created) => {
          notify(t.created);
          void navigate(cosechaPaths.producer(created.id));
        },
      });
    }
  };

  const toggleArchive = () => {
    if (!producer) return;
    const archived = !producer.isArchived;
    archive.mutate(
      { id: producer.id, archived, version: producer.version },
      {
        onSuccess: () => {
          notify(archived ? t.archived : t.restored);
          setArchiving(false);
        },
      },
    );
  };

  return (
    <section data-module="cosecha" className={pageClass}>
      <Link to={cosechaPaths.producers} className={`${linkButton} self-start`}>
        <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
        {t.back}
      </Link>
      <PageHeader
        title={producer ? producer.name : t.newTitle}
        actions={
          producer ? (
            <div className="flex flex-wrap gap-2">
              {hasPermission(cosechaPermissions.settlementsRead) ? (
                <Link to={cosechaPaths.settlement(producer.id)} className={secondaryButton}>
                  {t.statement}
                </Link>
              ) : null}
              {canManage ? (
                <Button variant="secondary" onClick={() => setArchiving(true)}>
                  {producer.isArchived ? t.restore : t.archive}
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />
      {producer?.isArchived ? (
        <Alert variant="info" message={t.archivedNotice} />
      ) : null}
      <Panel>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <TextField
            label={t.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldMessage(mutation.error, "name")}
            maxLength={150}
            required
            disabled={!canManage}
          />
          <TextField
            label={t.pickupPoint}
            value={pickupPoint}
            onChange={(event) => setPickupPoint(event.target.value)}
            error={fieldMessage(mutation.error, "pickupPoint")}
            maxLength={200}
            disabled={!canManage}
          />
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-fg">{t.phonesTitle}</legend>
            <p className="text-sm text-muted">{t.phonesHint}</p>
            {phones.map((row, index) => (
              <div
                key={index}
                className="grid items-end gap-3 sm:grid-cols-[minmax(10rem,14rem)_minmax(10rem,1fr)_auto_auto]"
              >
                <TextField
                  label={t.phone}
                  inputMode="tel"
                  value={row.phone}
                  onChange={(event) => setPhone(index, { phone: event.target.value })}
                  error={fieldMessage(mutation.error, `phones[${index}]`)}
                  disabled={!canManage}
                />
                <TextField
                  label={t.phoneLabel}
                  value={row.label}
                  onChange={(event) => setPhone(index, { label: event.target.value })}
                  maxLength={40}
                  disabled={!canManage}
                />
                <CheckboxField
                  label={t.primary}
                  checked={row.isPrimary}
                  onChange={() => makePrimary(index)}
                  disabled={!canManage}
                />
                {canManage && phones.length > 1 ? (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => removePhone(index)}
                    aria-label={t.removePhone}
                  >
                    {strings.common.remove}
                  </Button>
                ) : null}
              </div>
            ))}
            {fieldMessage(mutation.error, "phones") ? (
              <p role="alert" className="text-sm text-danger">
                {fieldMessage(mutation.error, "phones")}
              </p>
            ) : null}
            {canManage && phones.length < 5 ? (
              <Button
                variant="secondary"
                type="button"
                className="self-start"
                onClick={() =>
                  setPhones((rows) => [...rows, { phone: "", label: "", isPrimary: false }])
                }
              >
                {t.addPhone}
              </Button>
            ) : null}
          </fieldset>
          <LocationFields
            latitude={latitude}
            longitude={longitude}
            mapUrl={mapUrl}
            onLatitude={setLatitude}
            onLongitude={setLongitude}
            onMapUrl={setMapUrl}
            error={mutation.error}
            coordinatesError={coordinatesError}
          />
          <TextField
            label={t.notes}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            error={fieldMessage(mutation.error, "notes")}
            maxLength={1000}
            disabled={!canManage}
          />
          <FormAlert error={mutation.error} />
          {canManage ? (
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={mutation.isPending}
                loadingLabel={strings.common.saving}
              >
                {strings.common.save}
              </Button>
            </div>
          ) : null}
        </form>
      </Panel>
      {producer && canManage ? <CapacityPanel producer={producer} /> : null}
      {archiving && producer ? (
        <ConfirmDialog
          title={producer.isArchived ? t.restoreTitle : t.archiveTitle}
          message={producer.isArchived ? t.restoreMessage : t.archiveMessage}
          confirmLabel={producer.isArchived ? t.restore : t.archive}
          cancelLabel={strings.common.cancel}
          pendingLabel={strings.common.saving}
          pending={archive.isPending}
          onConfirm={toggleArchive}
          onClose={() => setArchiving(false)}
        >
          <FormAlert error={archive.error} />
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

/** Alta (`/productores/nuevo`) y ficha (`/productores/:id`) de un productor. */
export function Component() {
  const { id } = useParams();
  const detail = useProducer(id);
  if (!id) return <ProducerForm />;
  return (
    <QueryState query={detail}>
      {(producer) => (
        <ProducerForm key={`${producer.id}-${producer.version}`} producer={producer} />
      )}
    </QueryState>
  );
}
