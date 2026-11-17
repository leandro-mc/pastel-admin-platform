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
import { useArchiveBuyer, useCreateBuyer, useUpdateBuyer } from "../api/mutations";
import { useBuyer } from "../api/queries";
import type { BuyerDetail } from "../api/schemas";
import { FormAlert } from "../components/FormAlert";
import { LocationFields, parseCoordinates } from "../components/LocationFields";
import { QueryState } from "../components/QueryState";
import { fieldMessage } from "../errors";
import { formatPhone, parseDecimal, toFieldText } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { linkButton, pageClass, secondaryButton } from "../styles";

const t = strings.people.buyers;
const GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

type ContactRow = { name: string; phone: string; roleTitle: string; isPrimary: boolean };

function BuyerForm({ buyer }: { buyer?: BuyerDetail }) {
  const navigate = useNavigate();
  const notify = useNotify();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.buyersManage);
  const create = useCreateBuyer();
  const update = useUpdateBuyer();
  const archive = useArchiveBuyer();
  const mutation = buyer ? update : create;

  const [name, setName] = useState(buyer?.name ?? "");
  const [address, setAddress] = useState(buyer?.address ?? "");
  const [zone, setZone] = useState(buyer?.zone ?? "");
  const [conditions, setConditions] = useState(buyer?.deliveryConditions ?? "");
  const [notes, setNotes] = useState(buyer?.notes ?? "");
  const [userId, setUserId] = useState(buyer?.userId ?? "");
  const [latitude, setLatitude] = useState(toFieldText(buyer?.latitude));
  const [longitude, setLongitude] = useState(toFieldText(buyer?.longitude));
  const [mapUrl, setMapUrl] = useState(buyer?.mapUrl ?? "");
  const [contacts, setContacts] = useState<ContactRow[]>(
    buyer && buyer.contacts.length > 0
      ? buyer.contacts.map((c) => ({
          name: c.name,
          phone: c.phone ? formatPhone(c.phone) : "",
          roleTitle: c.roleTitle ?? "",
          isPrimary: c.isPrimary,
        }))
      : [{ name: "", phone: "", roleTitle: "", isPrimary: true }],
  );
  const [coordinatesError, setCoordinatesError] = useState<string>();
  const [userIdError, setUserIdError] = useState<string>();
  const [archiving, setArchiving] = useState(false);

  const setContact = (index: number, patch: Partial<ContactRow>) =>
    setContacts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const makePrimary = (index: number) =>
    setContacts((rows) => rows.map((row, i) => ({ ...row, isPrimary: i === index })));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const coords = parseCoordinates(latitude, longitude, parseDecimal);
    const linked = userId.trim();
    setCoordinatesError(coords.invalid ? strings.common.invalidNumber : undefined);
    setUserIdError(linked !== "" && !GUID.test(linked) ? t.userIdInvalid : undefined);
    if (coords.invalid || (linked !== "" && !GUID.test(linked))) return;
    const body = {
      name,
      address: address.trim() || undefined,
      zone: zone.trim() || undefined,
      latitude: coords.latitude,
      longitude: coords.longitude,
      mapUrl: mapUrl.trim() || undefined,
      deliveryConditions: conditions.trim() || undefined,
      notes: notes.trim() || undefined,
      userId: linked === "" ? null : linked,
      contacts: contacts
        .filter((row) => row.name.trim() !== "" || row.phone.trim() !== "")
        .map((row) => ({
          name: row.name,
          phone: row.phone.trim() || undefined,
          roleTitle: row.roleTitle.trim() || undefined,
          isPrimary: row.isPrimary,
        })),
      version: buyer?.version,
    };
    if (buyer) {
      update.mutate({ id: buyer.id, body }, { onSuccess: () => notify(t.saved) });
    } else {
      create.mutate(body, {
        onSuccess: (created) => {
          notify(t.created);
          void navigate(cosechaPaths.buyer(created.id));
        },
      });
    }
  };

  const toggleArchive = () => {
    if (!buyer) return;
    const archived = !buyer.isArchived;
    archive.mutate(
      { id: buyer.id, archived, version: buyer.version },
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
      <Link to={cosechaPaths.buyers} className={`${linkButton} self-start`}>
        <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
        {t.back}
      </Link>
      <PageHeader
        title={buyer ? buyer.name : t.newTitle}
        actions={
          buyer ? (
            <div className="flex flex-wrap gap-2">
              <Link to={`${cosechaPaths.orders}?buyerId=${buyer.id}`} className={secondaryButton}>
                {t.orders}
              </Link>
              {canManage ? (
                <Button variant="secondary" onClick={() => setArchiving(true)}>
                  {buyer.isArchived ? t.restore : t.archive}
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />
      {buyer?.isArchived ? <Alert variant="info" message={t.archivedNotice} /> : null}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t.zone}
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              error={fieldMessage(mutation.error, "zone")}
              maxLength={100}
              disabled={!canManage}
            />
            <TextField
              label={t.address}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              error={fieldMessage(mutation.error, "address")}
              maxLength={300}
              disabled={!canManage}
            />
          </div>
          <TextField
            label={t.deliveryConditions}
            hint={t.deliveryConditionsHint}
            value={conditions}
            onChange={(event) => setConditions(event.target.value)}
            error={fieldMessage(mutation.error, "deliveryConditions")}
            maxLength={500}
            disabled={!canManage}
          />
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-fg">{t.contactsTitle}</legend>
            <p className="text-sm text-muted">{t.contactsHint}</p>
            {contacts.map((row, index) => (
              <div
                key={index}
                className="grid items-end gap-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(9rem,12rem)_minmax(9rem,1fr)_auto_auto]"
              >
                <TextField
                  label={t.contactName}
                  value={row.name}
                  onChange={(event) => setContact(index, { name: event.target.value })}
                  error={fieldMessage(mutation.error, `contacts[${index}].name`)}
                  disabled={!canManage}
                />
                <TextField
                  label={t.contactPhone}
                  inputMode="tel"
                  value={row.phone}
                  onChange={(event) => setContact(index, { phone: event.target.value })}
                  error={fieldMessage(mutation.error, `contacts[${index}].phone`)}
                  disabled={!canManage}
                />
                <TextField
                  label={t.contactRole}
                  value={row.roleTitle}
                  onChange={(event) => setContact(index, { roleTitle: event.target.value })}
                  maxLength={100}
                  disabled={!canManage}
                />
                <CheckboxField
                  label={t.primary}
                  checked={row.isPrimary}
                  onChange={() => makePrimary(index)}
                  disabled={!canManage}
                />
                {canManage && contacts.length > 1 ? (
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label={t.removeContact}
                    onClick={() => setContacts((rows) => rows.filter((_, i) => i !== index))}
                  >
                    {strings.common.remove}
                  </Button>
                ) : null}
              </div>
            ))}
            {fieldMessage(mutation.error, "contacts") ? (
              <p role="alert" className="text-sm text-danger">
                {fieldMessage(mutation.error, "contacts")}
              </p>
            ) : null}
            {canManage && contacts.length < 10 ? (
              <Button
                variant="secondary"
                type="button"
                className="self-start"
                onClick={() =>
                  setContacts((rows) => [
                    ...rows,
                    { name: "", phone: "", roleTitle: "", isPrimary: false },
                  ])
                }
              >
                {t.addContact}
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
            label={t.userId}
            hint={t.userIdHint}
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            error={userIdError ?? fieldMessage(mutation.error, "userId")}
            disabled={!canManage}
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
      {archiving && buyer ? (
        <ConfirmDialog
          title={buyer.isArchived ? t.restoreTitle : t.archiveTitle}
          message={buyer.isArchived ? t.restoreMessage : t.archiveMessage}
          confirmLabel={buyer.isArchived ? t.restore : t.archive}
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

/** Alta (`/compradores/nuevo`) y ficha (`/compradores/:id`) de un comprador. */
export function Component() {
  const { id } = useParams();
  const detail = useBuyer(id);
  if (!id) return <BuyerForm />;
  return (
    <QueryState query={detail}>
      {(buyer) => <BuyerForm key={`${buyer.id}-${buyer.version}`} buyer={buyer} />}
    </QueryState>
  );
}
