import { useState, type FormEvent } from "react";
import { Alert, Button, Dialog, SelectField, TextField } from "@/core/ui";
import { isApiError } from "@/core/api";
import { useSaveExpense } from "../api/mutations";
import type { Expense, Group, Participant } from "../api/schemas";
import { fieldError, messageFor } from "../lib/errors";
import { parseAmount } from "../lib/money";
import { strings } from "../strings";
import { useCurrencyInfo } from "./Amount";

type Props = {
  groupId: string;
  group: Group;
  participants: Participant[];
  expense?: Expense;
  onClose: () => void;
};

/** Alta y edición de un gasto. Un miembro solo puede registrar lo que él pagó; quien administra elige al pagador. */
export function ExpenseDialog({ groupId, group, participants, expense, onClose }: Props) {
  const currency = useCurrencyInfo(group.currencyCode);
  const mutation = useSaveExpense(groupId, expense?.id ?? null);
  const isAdmin = group.myRole === "admin";
  const [payerId, setPayerId] = useState(expense?.payerId ?? group.myParticipantId);
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? expense.amount.replace(".", ",") : "");
  const [date, setDate] = useState(expense?.date ?? group.today);
  const [local, setLocal] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const text = description.trim();
    if (text.length < 4 || text.length > 500) errors.description = strings.expense.descriptionRule;
    const parsed = parseAmount(amount, currency.decimals);
    if (!parsed.ok) errors.amount = strings.amount[parsed.code](currency.decimals);
    if (!date) errors.date = strings.expense.dateRule;
    setLocal(errors);
    if (Object.keys(errors).length > 0 || !parsed.ok) return;
    mutation.mutate(
      { payerId, description: text, amount: parsed.value, date, version: expense?.version ?? 0 },
      { onSuccess: onClose },
    );
  }

  const general = mutation.error && !(isApiError(mutation.error) && mutation.error.isValidation);

  return (
    <Dialog
      title={expense ? strings.expense.editTitle : strings.expense.newTitle}
      description={strings.expense.currencyNote(group.currencyCode)}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {general ? <Alert variant="error" message={messageFor(mutation.error)} /> : null}
        <SelectField
          label={strings.expense.payer}
          value={payerId}
          onChange={(event) => setPayerId(event.target.value)}
          disabled={!isAdmin}
          hint={isAdmin ? undefined : strings.expense.payerMemberHint}
          error={fieldError(mutation.error, "payerId")}
          options={participants.map((p) => ({ value: p.id, label: p.isMe ? `${p.displayName} ${strings.people.you}` : p.displayName }))}
        />
        <TextField
          label={strings.expense.description}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          error={local.description ?? fieldError(mutation.error, "description")}
        />
        <TextField
          label={strings.expense.amount(currency.symbol)}
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hint={strings.expense.amountHint(currency.decimals)}
          error={local.amount ?? fieldError(mutation.error, "amount")}
        />
        <TextField
          label={strings.expense.date}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={local.date ?? fieldError(mutation.error, "date")}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button type="submit" loading={mutation.isPending} loadingLabel={strings.common.saving}>
            {strings.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
