import { useMemo } from "react";
import { fingerprintShape } from "../lib/fingerprint";
import { strings } from "../strings";

/** Dibujo generativo de la publicación; decorativo en el perfil, con el nombre de la huella para lectores de pantalla. */
export function Fingerprint({
  seed,
  caption = strings.public.fingerprint,
  label = strings.public.fingerprintLabel,
}: {
  seed: string;
  caption?: (id: string) => string;
  label?: (id: string) => string;
}) {
  const shape = useMemo(() => fingerprintShape(seed), [seed]);
  return (
    <figure className="hp-fp">
      <svg
        viewBox={`0 0 ${shape.size} ${shape.size}`}
        role="img"
        aria-label={label(shape.id)}
      >
        {shape.paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={p.strokeWidth}
            strokeDasharray={p.dash ?? undefined}
          />
        ))}
      </svg>
      <figcaption>{caption(shape.id)}</figcaption>
    </figure>
  );
}
