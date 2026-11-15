import { PageHeader, Panel } from "@/core/ui";
import { usePreview, useProfile } from "../api/hooks";
import { Loaded } from "../components/Form";
import { ProfileForm } from "../components/ProfileForm";
import { PublicProfileView } from "../components/PublicProfileView";
import { PublicationPanel } from "../components/PublicationPanel";
import { strings } from "../strings";

export function Component() {
  const profile = useProfile();
  const preview = usePreview();
  return (
    <div
      data-module="huella"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title={strings.publication.title}
        description={strings.publication.description}
      />
      <PublicationPanel hasCv={preview.data?.hasCv ?? false} />
      <Loaded query={profile}>
        {(data) => <ProfileForm profile={data} />}
      </Loaded>
      <Panel
        title={strings.publication.preview.title}
        description={strings.publication.preview.description}
      >
        <Loaded query={preview}>
          {(data) => (
            <div className="overflow-hidden rounded-xl border border-line">
              <PublicProfileView
                profile={data.profile}
                seed={data.seed}
                preview
              />
            </div>
          )}
        </Loaded>
      </Panel>
    </div>
  );
}
