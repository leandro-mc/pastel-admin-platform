import { Button, PageHeader, Tab, TabList, TabPanel, Tabs } from "@/core/ui";
import { useVersion, useVersions } from "../api/hooks";
import { CvEditor } from "../components/CvEditor";
import { DocumentsList } from "../components/DocumentsList";
import { Loaded } from "../components/Form";
import { GenerateWorkspace } from "../components/GenerateWorkspace";
import { OfferList } from "../components/OfferList";
import { StudioContextBar } from "../components/StudioContextBar";
import { useStudioState, type StudioTab } from "../lib/studioState";
import { strings } from "../strings";

const tabs = strings.studio.tabs;

/**
 * Crear CV, en tres pestañas con una barra fija que dice con qué oferta se trabaja: Ofertas (elegir), Generar (pedir el
 * documento) y Documentos (lo generado, con su estado de envío). El lugar queda en la dirección: se puede recargar, volver
 * atrás y llegar desde el historial directo a los documentos de una oferta.
 */
export function Component() {
  const { offerId, docId, tab, go } = useStudioState();
  const versions = useVersions();
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
            {versions.data ? ` (${versions.data.length})` : ""}
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
            onGenerated={(id) => go({ vista: "documentos", doc: id })}
          />
        </TabPanel>
        <TabPanel id="documentos">
          {docId ? (
            <OpenDocument id={docId} onBack={() => go({ doc: null })} />
          ) : (
            <DocumentsList
              offerId={offerId}
              onOpen={(id) => go({ doc: id })}
              onDeleted={(id) => {
                if (id === docId) go({ doc: null });
              }}
            />
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

/** Un documento abierto: reemplaza a la lista (no se apila debajo) y se vuelve con un botón. */
function OpenDocument({ id, onBack }: { id: string; onBack: () => void }) {
  const version = useVersion(id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="secondary" type="button" onClick={onBack}>
          {strings.studio.docs.back}
        </Button>
      </div>
      <Loaded query={version}>{(data) => <CvEditor version={data} />}</Loaded>
    </div>
  );
}
