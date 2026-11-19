import { useState } from "react";
import { isApiError } from "@/core/api";
import { Alert, Button, Dialog } from "@/core/ui";
import { useNotify } from "@/core/notifications";
import { useReportError } from "../api/mutations";
import { describeError } from "../lib/format";
import { strings } from "../strings";
import { TextAreaField } from "./TextAreaField";

const MIN = 10;
const MAX = 500;

/** Aviso de error en una pieza (AG-CON-04): llega a la bandeja editorial. */
export function ReportErrorDialog({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const notify = useNotify();
  const report = useReportError();
  const [text, setText] = useState("");
  const fieldError =
    isApiError(report.error) && report.error.errors.text?.[0]
      ? report.error.errors.text[0]
      : undefined;

  return (
    <Dialog
      title={strings.article.reportTitle}
      description={strings.article.reportHint}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          report.mutate(
            { slug, text },
            {
              onSuccess: () => {
                notify(strings.article.reportThanks);
                onClose();
              },
            },
          );
        }}
      >
        <TextAreaField
          label={strings.article.reportField}
          value={text}
          maxLength={MAX}
          required
          rows={5}
          error={fieldError}
          hint={`${text.trim().length}/${MAX}`}
          onChange={(event) => setText(event.target.value)}
        />
        {report.isError && !fieldError ? (
          <Alert variant="error" message={describeError(report.error)} />
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {strings.common.back}
          </Button>
          <Button
            type="submit"
            loading={report.isPending}
            loadingLabel={strings.article.reportSending}
            disabled={text.trim().length < MIN}
          >
            {strings.article.reportSend}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
