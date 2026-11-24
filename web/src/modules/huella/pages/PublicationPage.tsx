import { PageHeader, Panel } from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import { usePreview, useProfile } from "../api/hooks";
import { ContentPanel } from "../components/ContentPanel";
import { Loaded } from "../components/Form";
import { ProfileForm } from "../components/ProfileForm";
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
      <Panel
        title={strings.publication.preview.title}
        description={strings.publication.preview.description}
      >
        <a
          className={`${secondaryButton} no-underline`}
          href="/huella/vista-previa"
          target="_blank"
          rel="noopener noreferrer"
        >
          {strings.publication.preview.open}
        </a>
      </Panel>
      <ContentPanel />
      <Loaded query={profile}>
        {(data) => <ProfileForm profile={data} />}
      </Loaded>
    </div>
  );
}
