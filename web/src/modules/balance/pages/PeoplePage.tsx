import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Alert, Badge, Button, ConfirmDialog, Panel, StateView } from "@/core/ui";
import { GroupFrame, useGroupId } from "../components/GroupFrame";
import { useCanWrite } from "../components/useCanWrite";
import { useCopy } from "../components/useCopy";
import { useLeaveGroup, useRegenerateInvitation, useRemoveParticipant, useSetRole } from "../api/mutations";
import { useGroup, useInvitation, useParticipants } from "../api/queries";
import type { Participant } from "../api/schemas";
import { messageFor } from "../lib/errors";
import { strings } from "../strings";

export function Component() {
  const groupId = useGroupId();
  return (
    <GroupFrame groupId={groupId}>
      <Content groupId={groupId} />
    </GroupFrame>
  );
}

function Content({ groupId }: { groupId: string }) {
  const navigate = useNavigate();
  const group = useGroup(groupId);
  const people = useParticipants(groupId);
  const canWrite = useCanWrite(group.data);
  const isAdmin = group.data?.myRole === "admin";
  const invitation = useInvitation(groupId, { enabled: isAdmin });
  const setRole = useSetRole(groupId);
  const remove = useRemoveParticipant(groupId);
  const leave = useLeaveGroup(groupId);
  const regenerate = useRegenerateInvitation(groupId);
  const { copied, copy } = useCopy();
  const [removing, setRemoving] = useState<Participant | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (people.isPending) return <StateView status="loading" title={strings.common.loading} />;
  if (people.isError) return <StateView status="error" title={strings.common.loadFailed} description={messageFor(people.error)} />;

  const error = setRole.error ?? remove.error ?? leave.error ?? regenerate.error;
  const link = invitation.data ? `${window.location.origin}/balance/unirse#${invitation.data.token}` : "";

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert variant="error" message={messageFor(error)} /> : null}

      {isAdmin ? (
        <Panel title={strings.people.inviteTitle} description={strings.people.inviteHint}>
          {invitation.isPending ? (
            <p className="text-sm text-muted">{strings.common.loading}</p>
          ) : invitation.isError ? (
            <Alert variant="error" message={messageFor(invitation.error)} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 rounded-xl bg-accent-soft px-3 py-2 text-sm break-all text-fg">{link}</code>
                <Button variant="secondary" onClick={() => void copy("link", link)}>
                  {copied === "link" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                  {copied === "link" ? strings.common.copied : strings.people.copyLink}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">{strings.people.code}</span>
                <code className="rounded-xl bg-accent-soft px-3 py-2 text-lg font-semibold tracking-[0.3em] text-fg">{invitation.data.code}</code>
                <Button variant="secondary" onClick={() => void copy("code", invitation.data.code)}>
                  {copied === "code" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                  {copied === "code" ? strings.common.copied : strings.people.copyCode}
                </Button>
                {canWrite ? (
                  <Button variant="ghost" onClick={() => setRegenerating(true)}>
                    <RefreshCw aria-hidden="true" className="size-4" />
                    {strings.people.regenerate}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </Panel>
      ) : null}

      <Panel title={strings.people.title} description={strings.people.orderNote}>
        <ul className="flex flex-col divide-y divide-line">
          {people.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {p.displayName} {p.isMe ? <span className="text-muted">{strings.people.you}</span> : null}
                </p>
                <p className="text-sm text-muted">
                  {strings.people.joinedOrder(p.joinOrder)} · {strings.people.expenseCount(p.expenseCount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={p.role === "admin" ? "accent" : "neutral"}>{p.role === "admin" ? strings.people.admin : strings.people.member}</Badge>
                {isAdmin && canWrite ? (
                  <>
                    <Button
                      variant="secondary"
                      loading={setRole.isPending && setRole.variables?.participantId === p.id}
                      onClick={() => setRole.mutate({ participantId: p.id, role: p.role === "admin" ? "member" : "admin" })}
                    >
                      {p.role === "admin" ? strings.people.removeAdmin : strings.people.makeAdmin}
                    </Button>
                    <Button variant="danger" disabled={p.expenseCount > 0} aria-describedby={p.expenseCount > 0 ? `why-${p.id}` : undefined} onClick={() => setRemoving(p)}>
                      {strings.people.remove}
                    </Button>
                  </>
                ) : null}
              </div>
              {isAdmin && p.expenseCount > 0 ? (
                <p id={`why-${p.id}`} className="basis-full text-xs text-muted">
                  {strings.people.cannotRemove}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {canWrite ? (
          <Button variant="ghost" className="mt-3" onClick={() => setLeaving(true)}>
            {strings.people.leave}
          </Button>
        ) : null}
      </Panel>

      {removing ? (
        <ConfirmDialog
          title={strings.people.removeTitle}
          message={strings.people.removeMessage(removing.displayName)}
          confirmLabel={strings.people.remove}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          onClose={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing.id, { onSettled: () => setRemoving(null) })}
        />
      ) : null}
      {leaving ? (
        <ConfirmDialog
          title={strings.people.leaveTitle}
          message={strings.people.leaveMessage}
          confirmLabel={strings.people.leave}
          cancelLabel={strings.common.cancel}
          pending={leave.isPending}
          onClose={() => setLeaving(false)}
          onConfirm={() => leave.mutate(undefined, { onSuccess: () => void navigate("/balance"), onSettled: () => setLeaving(false) })}
        />
      ) : null}
      {regenerating ? (
        <ConfirmDialog
          title={strings.people.regenerateTitle}
          message={strings.people.regenerateMessage}
          confirmLabel={strings.people.regenerate}
          cancelLabel={strings.common.cancel}
          pending={regenerate.isPending}
          onClose={() => setRegenerating(false)}
          onConfirm={() => regenerate.mutate(undefined, { onSettled: () => setRegenerating(false) })}
        />
      ) : null}
    </div>
  );
}
