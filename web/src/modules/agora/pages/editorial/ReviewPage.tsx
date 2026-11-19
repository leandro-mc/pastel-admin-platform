import { useState } from "react";
import { Link } from "react-router";
import { useNotify } from "@/core/notifications";
import { Badge, Button, StateView, Tab, TabList, TabPanel, Tabs } from "@/core/ui";
import { useVerify, useWithdrawVerification } from "../../api/mutations";
import { useReviewQueue, useReviewVerifications } from "../../api/queries";
import type { ArticleCard as ArticleCardData, ReviewVerification } from "../../api/schemas";
import { ArticleCard } from "../../components/ArticleCard";
import { EditorialShell } from "../../components/EditorialShell";
import { LoadError, LoadingState, Pager } from "../../components/Feedback";
import { PromptDialog } from "../../components/PromptDialog";
import { formatDate } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { agoraPaths } from "../../paths";
import { agoraPermissions } from "../../permissions";
import { strings } from "../../strings";

const r = strings.editorial.review;

/**
 * Revisión (AG-VER-01 y AG-VER-02): la cola excluye lo que la persona escribió o editó, y verificar exige escribir el alcance
 * revisado. El sello pide tantas verificaciones de personas distintas como indique la configuración del servidor.
 */
export function Component() {
  useDocumentTitle(strings.editorial.nav.review);
  return (
    <EditorialShell
      permission={agoraPermissions.review}
      title={strings.editorial.nav.review}
      description={r.description}
    >
      <Tabs>
        <TabList aria-label={strings.editorial.nav.review}>
          <Tab id="queue">{r.queueTab}</Tab>
          <Tab id="verifications">{r.verificationsTab}</Tab>
        </TabList>
        <TabPanel id="queue">
          <QueueTab />
        </TabPanel>
        <TabPanel id="verifications">
          <VerificationsTab />
        </TabPanel>
      </Tabs>
    </EditorialShell>
  );
}

function QueueTab() {
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const queue = useReviewQueue(page);
  const verify = useVerify();
  const [target, setTarget] = useState<ArticleCardData | null>(null);

  if (queue.isPending) return <LoadingState />;
  if (queue.isError) return <LoadError error={queue.error} onRetry={() => void queue.refetch()} />;
  if (queue.data.items.length === 0)
    return <StateView status="success" title={r.queueEmpty} />;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-5">
        {queue.data.items.map((card) => (
          <li key={card.id} className="flex flex-col gap-2">
            <ArticleCard article={card} />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => {
                  verify.reset();
                  setTarget(card);
                }}
              >
                {r.verify}
              </Button>
              <Link
                to={agoraPaths.article(card.slug)}
                className="text-sm font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
              >
                {strings.editorial.common.viewPiece}
              </Link>
              {card.seal.requiredReviews > 1 ? (
                <span className="text-sm text-muted">
                  {r.progress(card.seal.activeReviews, card.seal.requiredReviews)}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Pager page={queue.data.page} totalPages={queue.data.totalPages} onPage={setPage} />

      {target ? (
        <PromptDialog
          title={`${r.verifyTitle}: ${target.title}`}
          description={r.verifyDescription}
          fields={[
            { name: "scope", label: r.scope, hint: r.scopeHint, minLength: 10, maxLength: 500 },
            { name: "note", label: `${r.note} ${strings.editorial.common.optional}`, minLength: 0, maxLength: 500 },
          ]}
          confirmLabel={r.verify}
          pending={verify.isPending}
          error={verify.error}
          onClose={() => setTarget(null)}
          onSubmit={(values) =>
            verify.mutate(
              { id: target.id, scope: values.scope ?? "", note: values.note ?? "" },
              {
                onSuccess: () => {
                  notify(r.verified);
                  setTarget(null);
                },
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

function VerificationsTab() {
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const list = useReviewVerifications(page);
  const withdraw = useWithdrawVerification();
  const [target, setTarget] = useState<ReviewVerification | null>(null);

  if (list.isPending) return <LoadingState />;
  if (list.isError) return <LoadError error={list.error} onRetry={() => void list.refetch()} />;
  if (list.data.items.length === 0)
    return <StateView status="empty" title={r.verificationsEmpty} />;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {list.data.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={agoraPaths.article(item.articleSlug)}
                className="font-semibold text-fg hover:underline"
              >
                {item.articleTitle}
              </Link>
              {item.isCurrent ? null : <Badge variant="warning">{r.previous}</Badge>}
            </div>
            <p className="text-sm text-muted">{r.verifiedBy(item.reviewerName, formatDate(item.verifiedAt))}</p>
            <p className="text-sm text-fg-secondary">
              <span className="font-semibold">{strings.article.scope}:</span> {item.scope}
            </p>
            {item.note ? (
              <p className="text-sm text-fg-secondary">
                <span className="font-semibold">{strings.article.note}:</span> {item.note}
              </p>
            ) : null}
            <div>
              <Button
                variant="danger"
                onClick={() => {
                  withdraw.reset();
                  setTarget(item);
                }}
              >
                {r.withdraw}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Pager page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} />

      {target ? (
        <PromptDialog
          title={`${r.withdrawTitle}: ${target.articleTitle}`}
          description={r.withdrawDescription}
          fields={[{ name: "note", label: r.withdrawNote, minLength: 10, maxLength: 500 }]}
          confirmLabel={r.withdraw}
          pending={withdraw.isPending}
          error={withdraw.error}
          onClose={() => setTarget(null)}
          onSubmit={(values) =>
            withdraw.mutate(
              { id: target.id, note: values.note ?? "" },
              {
                onSuccess: () => {
                  notify(r.withdrawn);
                  setTarget(null);
                },
              },
            )
          }
        />
      ) : null}
    </div>
  );
}
