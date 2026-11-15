import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Alert, Badge, Button, ConfirmDialog, Panel } from "@/core/ui";
import {
  usePublicationStatus,
  usePublish,
  useRegenerateLink,
  useUnpublish,
} from "../api/hooks";
import type { PublicationStatus } from "../api/schemas";
import { strings } from "../strings";
import { ErrorNotice, Loaded } from "./Form";

const t = strings.publication;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date(iso));

/** Estado, publicación y enlace. El token solo se ve al crearlo: aquí se guarda en memoria y se pierde al salir. */
export function PublicationPanel({ hasCv }: { hasCv: boolean }) {
  const status = usePublicationStatus();
  return (
    <Loaded query={status}>
      {(data) => <Body status={data} hasCv={hasCv} />}
    </Loaded>
  );
}

function Body({
  status,
  hasCv,
}: {
  status: PublicationStatus;
  hasCv: boolean;
}) {
  const notify = useNotify();
  const publish = usePublish();
  const unpublish = useUnpublish();
  const regenerate = useRegenerateLink();
  const [token, setToken] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"unpublish" | "regenerate" | null>(
    null,
  );

  const url = token ? `${window.location.origin}/huella/p/${token}` : null;
  const showToken = (result: { token: string | null }) => {
    if (result.token) setToken(result.token);
  };

  return (
    <Panel
      title={t.status.title}
      actions={
        <Badge variant={status.isPublished ? "success" : "neutral"}>
          {status.isPublished ? t.status.published : t.status.draft}
        </Badge>
      }
    >
      <div className="flex flex-col gap-4">
        {status.isPublished && status.publishedVersion !== null ? (
          <p className="text-sm text-fg">
            {t.status.version(status.publishedVersion)}
            {status.publishedAt ? ` · ${formatDate(status.publishedAt)}` : ""}
          </p>
        ) : null}
        {status.isPublished ? (
          <p className="text-sm text-muted">
            {status.hasUnpublishedChanges
              ? t.status.changes
              : t.status.upToDate}
          </p>
        ) : null}
        <p className="text-sm text-muted">
          {hasCv ? t.status.cvIncluded : t.status.cvMissing}
        </p>
        {!status.canPublish && status.blockedReason ? (
          <Alert variant="warning" message={status.blockedReason} />
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            type="button"
            disabled={
              !status.canPublish ||
              (status.isPublished && !status.hasUnpublishedChanges)
            }
            loading={publish.isPending}
            loadingLabel={t.status.publishing}
            onClick={() =>
              publish.mutate(undefined, {
                onSuccess: (result) => {
                  showToken(result);
                  notify(strings.common.saved);
                },
              })
            }
          >
            {status.isPublished ? t.status.republish : t.status.publish}
          </Button>
          {status.isPublished ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => setConfirm("unpublish")}
            >
              {t.status.unpublish}
            </Button>
          ) : null}
        </div>
        <ErrorNotice error={publish.error ?? unpublish.error} />

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-base font-semibold text-fg">{t.link.title}</h3>
          <p className="text-sm text-muted">{t.link.description}</p>
          {url ? (
            <div className="flex flex-col gap-2 rounded-lg border border-line-strong p-3">
              <p className="text-sm font-medium text-fg">{t.link.created}</p>
              <input
                readOnly
                aria-label={t.link.created}
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm text-fg"
              />
              <div>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(url)
                      .then(() => notify(t.link.copied))
                  }
                >
                  {t.link.copy}
                </Button>
              </div>
            </div>
          ) : status.hasLink && status.linkCreatedAt ? (
            <p className="text-sm text-fg">
              {t.link.exists(formatDate(status.linkCreatedAt))}
            </p>
          ) : (
            <p className="text-sm text-muted">{t.link.none}</p>
          )}
          {status.hasLink ? (
            <div>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setConfirm("regenerate")}
              >
                {t.link.regenerate}
              </Button>
            </div>
          ) : null}
          <ErrorNotice error={regenerate.error} />
        </div>
      </div>

      {confirm === "unpublish" ? (
        <ConfirmDialog
          title={t.status.unpublishTitle}
          message={t.status.unpublishMessage}
          confirmLabel={t.status.unpublish}
          cancelLabel={strings.common.cancel}
          pending={unpublish.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            unpublish.mutate(undefined, {
              onSuccess: () => {
                setToken(null);
                setConfirm(null);
              },
            })
          }
        />
      ) : null}
      {confirm === "regenerate" ? (
        <ConfirmDialog
          title={t.link.regenerateTitle}
          message={t.link.regenerateMessage}
          confirmLabel={t.link.regenerate}
          cancelLabel={strings.common.cancel}
          pending={regenerate.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            regenerate.mutate(undefined, {
              onSuccess: (result) => {
                showToken(result);
                setConfirm(null);
              },
            })
          }
        />
      ) : null}
    </Panel>
  );
}
