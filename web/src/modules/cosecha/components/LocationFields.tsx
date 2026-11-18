import { TextField } from "@/core/ui";
import { fieldMessage } from "../errors";
import { strings } from "../strings";

type Props = {
  latitude: string;
  longitude: string;
  mapUrl: string;
  onLatitude: (value: string) => void;
  onLongitude: (value: string) => void;
  onMapUrl: (value: string) => void;
  error: unknown;
  coordinatesError?: string;
};

const t = strings.people.location;

/** Ubicación opcional (latitud, longitud y enlace de mapa) de un productor o comprador. */
export function LocationFields({
  latitude,
  longitude,
  mapUrl,
  onLatitude,
  onLongitude,
  onMapUrl,
  error,
  coordinatesError,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t.latitude}
          hint={t.coordsHint}
          inputMode="decimal"
          value={latitude}
          onChange={(event) => onLatitude(event.target.value)}
          error={coordinatesError ?? fieldMessage(error, "latitude")}
        />
        <TextField
          label={t.longitude}
          inputMode="decimal"
          value={longitude}
          onChange={(event) => onLongitude(event.target.value)}
          error={fieldMessage(error, "longitude")}
        />
      </div>
      <TextField
        label={t.mapUrl}
        hint={t.mapUrlHint}
        type="url"
        value={mapUrl}
        onChange={(event) => onMapUrl(event.target.value)}
        error={fieldMessage(error, "mapUrl")}
        maxLength={500}
      />
      {/^https?:\/\//i.test(mapUrl.trim()) ? (
        <a
          href={mapUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center self-start text-sm font-medium text-accent-strong underline-offset-2 hover:underline"
        >
          {t.openMap}
        </a>
      ) : null}
    </div>
  );
}

/** Convierte los textos de latitud y longitud a números (o `null` si están vacíos); `invalid` indica un número mal escrito. */
export function parseCoordinates(
  latitude: string,
  longitude: string,
  parse: (text: string) => number | null,
): { latitude: number | null; longitude: number | null; invalid: boolean } {
  const lat = latitude.trim() === "" ? null : parse(latitude);
  const lng = longitude.trim() === "" ? null : parse(longitude);
  const invalid =
    (latitude.trim() !== "" && lat === null) ||
    (longitude.trim() !== "" && lng === null);
  return { latitude: lat, longitude: lng, invalid };
}
