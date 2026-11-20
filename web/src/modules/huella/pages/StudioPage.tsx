import { Button, PageHeader, Tab, TabList, TabPanel, Tabs } from "@/core/ui";
import { useLetter, useLetters, useVersion, useVersions } from "../api/hooks";
import { CvEditor } from "../components/CvEditor";
import { DocumentsList } from "../components/DocumentsList";
import { Loaded } from "../components/Form";
import { GenerateWorkspace } from "../components/GenerateWorkspace";
import { LetterEditor } from "../components/LetterEditor";
import { OfferList } from "../components/OfferList";
import { StudioContextBar } from "../components/StudioContextBar";
import { useStudioState, type DocKind, type StudioTab } from "../lib/studioState";
import { strings } from "../strings";

const tabs = strings.studio.tabs;

/**
 * Crear CV y carta, en tres pestañas con una barra fija que dice con qué oferta se trabaja: Ofertas (elegir), Generar (pedir
 * el CV o la carta) y Documentos (lo generado, con su estado de envío). El lugar queda en la dirección: se puede recargar,
 * volver atrás y llegar desde el historial directo a los documentos de una oferta.
 */
export function Component() {
  const { offerId, docId, docKind, tab, go } = useStudioState();
  const versions = useVersions();
  const letters = useLetters();
  const count =
    versions.data && letters.data ? versions.data.length + letters.data.length : null;
  return (
    <div
      data-module="huella"
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6"
    >
      <PageHeader
        title={strings.studio.title}
        description={strings.studio.description}
      />
      <StudioContextBar
        offerId={offerId}
        onPick={() => go({ vista: "ofertas", doc: null })}
        onClear={() => go({ oferta: null, doc: null })}
      />
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) =>
          go({ vista: key as StudioTab, doc: key === "documentos" ? docId : null })
        }
      >
        <TabList aria-label={tabs.label}>
          <Tab id="ofertas">{tabs.offers}</Tab>
          <Tab id="generar">{tabs.generate}</Tab>
          <Tab id="documentos">
            {tabs.documents}
            {count !== null ? ` (${count})` : ""}
          </Tab>
        </TabList>
        <TabPanel id="ofertas">
          <OfferList
            selectedId={offerId}
            onUse={(id) => go({ oferta: id, vista: "generar", doc: null })}
            onDocuments={(id) => go({ oferta: id, vista: "documentos", doc: null })}
            onClear={() => go({ oferta: null, doc: null })}
          />
        </TabPanel>
        <TabPanel id="generar">
          <GenerateWorkspace
            offerId={offerId}
            onPickOffer={() => go({ vista: "ofertas" })}
            onGenerated={(kind, id) => go({ vista: "documentos", doc: id, tipo: kind })}
          />
        </TabPanel>
        <TabPanel id="documentos">
          {docId ? (
            <OpenDocument
              kind={docKind}
              id={docId}
              onBack={() => go({ doc: null, tipo: null })}
            />
          ) : (
            <DocumentsList
              offerId={offerId}
              onOpen={(kind, id) => go({ doc: id, tipo: kind })}
              onDeleted={(_kind, id) => {
                if (id === docId) go({ doc: null, tipo: null });
              }}
            />
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

/** Un documento abierto: reemplaza a la lista (no se apila debajo) y se vuelve con un botón. */
function OpenDocument({
  kind,
  id,
  onBack,
}: {
  kind: DocKind;
  id: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="secondary" type="button" onClick={onBack}>
          {strings.studio.docs.back}
        </Button>
      </div>
      {kind === "carta" ? <OpenLetter id={id} /> : <OpenCv id={id} />}
    </div>
  );
}

function OpenCv({ id }: { id: string }) {
  const version = useVersion(id);
  return <Loaded query={version}>{(data) => <CvEditor key={data.summary.id} version={data} />}</Loaded>;
}

function OpenLetter({ id }: { id: string }) {
  const letter = useLetter(id);
  return <Loaded query={letter}>{(data) => <LetterEditor letter={data} />}</Loaded>;
}
