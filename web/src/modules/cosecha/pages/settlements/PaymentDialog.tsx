import { useState, type FormEvent } from "react";
import { useNotify } from "@/core/notifications";
import { Button, Dialog, SelectField, TextField } from "@/core/ui";
import { useRegisterPayment } from "../../api/mutations";
import { FormAlert } from "../../components/FormAlert";
import { fieldMessage } from "../../errors";
import { formatCrc, parseDecimal, toFieldText, todayIso } from "../../format";
import { strings } from "../../strings";

const t = strings.settlements.dialog;

type Props = {
  producerId: string;
  /** Entregas marcadas; vacío = lo más antiguo primero. */
  deliveryIds: string[];
  /** Monto sugerido: lo pendiente de las entregas elegidas (o de todas). */
  suggestedCrc: number;
  onClose: () => void;
};

export function PaymentDialog({ producerId, deliveryIds, suggestedCrc, onClose }: Props) {
  const notify = useNotify();
  const register = useRegisterPayment();
  const [paidOn, setPaidOn] = useState(todayIso());
  const [amount, setAmount] = useState(toFieldText(suggestedCrc));
  const [method, setMethod] = useState("Sinpe");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = parseDecimal(amount);
    if (value === null) {
      setInvalid(strings.common.invalidNumber);
      return;
    }
    setInvalid(undefined);
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
      },
    );
  };

  return (
    <Dialog title={t.title} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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
          options={Object.entries(strings.status.method).map(([value, label]) => ({ value, label }))}
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
          <Button type="submit" loading={register.isPending} loadingLabel={strings.common.saving}>
            {t.submit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
