import { useState } from "react";
import { Link } from "react-router";
import { useNotify } from "@/core/notifications";
import { Badge, Button, SelectField, StateView } from "@/core/ui";
import { useResolveReport } from "../../api/mutations";
import { useErrorReports } from "../../api/queries";
import type { ErrorReport } from "../../api/schemas";
import { EditorialShell } from "../../components/EditorialShell";
import { LoadError, LoadingState, Pager } from "../../components/Feedback";
import { PromptDialog } from "../../components/PromptDialog";
import { formatDate } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { agoraPaths } from "../../paths";
import { agoraPermissions } from "../../permissions";
import { strings } from "../../strings";

const r = strings.editorial.reports;

/** Bandeja de errores señalados por las personas lectoras (AG-CON-04). Se atiende el contenido, no a quien avisa. */
export function Component() {
  useDocumentTitle(strings.editorial.nav.reports);
  return (
    <EditorialShell
      permission={agoraPermissions.manage}
      title={strings.editorial.nav.reports}
      description={r.description}
    >
      <ReportList />
    </EditorialShell>
  );
}

function ReportList() {
  const notify = useNotify();
  const [status, setStatus] = useState("received");
  const [page, setPage] = useState(1);
  const reports = useErrorReports(status, page);
  const resolve = useResolveReport();
  const [target, setTarget] = useState<{ report: ErrorReport; outcome: "resolved" | "dismissed" } | null>(null);

  return (
    <>
      <div className="max-w-xs">
        <SelectField
          label={r.statusFilter}
          value={status}
          options={[
            { value: "received", label: r.received },
            { value: "resolved", label: r.resolved },
            { value: "dismissed", label: r.dismissed },
          ]}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {reports.isPending ? <LoadingState /> : null}
      {reports.isError ? <LoadError error={reports.error} onRetry={() => void reports.refetch()} /> : null}
      {reports.data && reports.data.items.length === 0 ? <StateView status="empty" title={r.empty} /> : null}
      {reports.data && reports.data.items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {reports.data.items.map((report) => (
            <li key={report.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={agoraPaths.article(report.articleSlug)} className="font-semibold text-fg hover:underline">
                  {report.articleTitle}
                </Link>
                <Badge variant={report.status === "received" ? "warning" : "neutral"}>
                  {report.status === "received" ? r.received : report.status === "resolved" ? r.resolved : r.dismissed}
                </Badge>
              </div>
              <p className="leading-relaxed text-fg">{report.text}</p>
              <p className="text-xs text-muted">{r.reportedOn(formatDate(report.createdAt))}</p>
              {report.resolutionNote ? (
                <p className="text-sm text-fg-secondary">
                  <span className="font-semibold">{r.resolution}:</span> {report.resolutionNote}
                </p>
              ) : null}
              {report.status === "received" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      resolve.reset();
                      setTarget({ report, outcome: "resolved" });
                    }}
                  >
                    {r.resolve}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      resolve.reset();
                      setTarget({ report, outcome: "dismissed" });
                    }}
                  >
                    {r.dismiss}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {reports.data ? (
        <Pager page={reports.data.page} totalPages={reports.data.totalPages} onPage={setPage} />
      ) : null}

      {target ? (
        <PromptDialog
          title={target.outcome === "resolved" ? r.resolveTitle : r.dismissTitle}
          description={target.report.articleTitle}
          fields={[{ name: "note", label: `${r.noteLabel} ${strings.editorial.common.optional}`, hint: r.noteHint, minLength: 0, maxLength: 300 }]}
          confirmLabel={target.outcome === "resolved" ? r.resolve : r.dismiss}
          pending={resolve.isPending}
          error={resolve.error}
          onClose={() => setTarget(null)}
          onSubmit={(values) =>
            resolve.mutate(
              { id: target.report.id, outcome: target.outcome, note: values.note ?? "" },
              {
                onSuccess: () => {
                  notify(r.done);
                  setTarget(null);
                },
              },
            )
          }
        />
      ) : null}
    </>
  );
}
