import { useState, type FormEvent } from "react";
import { useNotify } from "@/core/notifications";
import { Button, Dialog, SelectField, TextField } from "@/core/ui";
import { useRegisterPayment } from "../../api/mutations";
import { FormAlert } from "../../components/FormAlert";
import { statusLabel } from "../../components/StatusBadge";
import { fieldMessage } from "../../errors";
import { formatCrc, formatDate, parseDecimal, toFieldText, todayIso } from "../../format";
import { strings } from "../../strings";

const t = strings.settlements.dialog;

type Props = {
  producerId: string;
  producerName: string;
  /** Entregas marcadas; vacío = lo más antiguo primero. */
  deliveryIds: string[];
  /** Monto sugerido: lo pendiente de las entregas elegidas (o de todas). */
  suggestedCrc: number;
  onClose: () => void;
};

/** Registrar un pago en dos pasos: llenar los datos y luego confirmar con un resumen (un pago equivocado se corrige anulándolo). */
export function PaymentDialog({ producerId, producerName, deliveryIds, suggestedCrc, onClose }: Props) {
  const notify = useNotify();
  const register = useRegisterPayment();
  const [paidOn, setPaidOn] = useState(todayIso());
  const [amount, setAmount] = useState(toFieldText(suggestedCrc));
  const [method, setMethod] = useState("Sinpe");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  const value = parseDecimal(amount);

  const review = (event: FormEvent) => {
    event.preventDefault();
    if (value === null) {
      setInvalid(strings.common.invalidNumber);
      return;
    }
    setInvalid(undefined);
    setConfirming(true);
  };

  const send = () => {
    if (value === null) return;
    register.mutate(
      {
        producerId,
        paidOn,
        amountCrc: value,
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        deliveryIds: deliveryIds.length > 0 ? deliveryIds : undefined,
      },
      {
        onSuccess: () => {
          notify(t.saved);
          onClose();
        },
        // Si el servidor rechaza (por ejemplo, monto mayor a lo adeudado), se vuelve al formulario con el mensaje.
        onError: () => setConfirming(false),
      },
    );
  };

  if (confirming) {
    return (
      <Dialog title={t.confirmTitle} description={t.confirmSummary} onClose={onClose}>
        <dl className="grid gap-2 text-sm">
          {[
            [t.producer, producerName],
            [t.amount, formatCrc(value)],
            [t.paidOn, formatDate(paidOn)],
            [t.method, statusLabel("method", method)],
            [t.appliedTo, deliveryIds.length > 0 ? t.appliedChosen(deliveryIds.length) : t.appliedOldest],
          ].map(([label, text]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-line py-1.5">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium text-fg">{text}</dd>
            </div>
          ))}
        </dl>
        <FormAlert error={register.error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            {t.back}
          </Button>
          <Button onClick={send} loading={register.isPending} loadingLabel={strings.common.saving}>
            {t.submit}
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={t.title} onClose={onClose}>
      <form onSubmit={review} noValidate className="flex flex-col gap-4">
        <TextField
          type="date"
          label={t.paidOn}
          value={paidOn}
          max={todayIso()}
          onChange={(event) => setPaidOn(event.target.value)}
          error={fieldMessage(register.error, "paidOn")}
          required
        />
        <TextField
          label={t.amount}
          hint={`${t.amountHint} ${t.suggested(formatCrc(suggestedCrc))}`}
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={invalid ?? fieldMessage(register.error, "amountCrc")}
          required
        />
        <SelectField
          label={t.method}
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          options={Object.entries(strings.status.method).map(([methodValue, label]) => ({ value: methodValue, label }))}
          error={fieldMessage(register.error, "method")}
        />
        <TextField
          label={t.reference}
          hint={t.referenceHint}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          error={fieldMessage(register.error, "reference")}
          maxLength={100}
        />
        <TextField
          label={t.note}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={fieldMessage(register.error, "note")}
          maxLength={500}
        />
        <FormAlert error={register.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button type="submit">{t.review}</Button>
        </div>
      </form>
    </Dialog>
  );
}
