import { useMemo } from "react";
import { fingerprintShape } from "../lib/fingerprint";
import { strings } from "../strings";

/** Dibujo generativo de la publicación; decorativo en el perfil, con el nombre de la huella para lectores de pantalla. */
export function Fingerprint({ seed }: { seed: string }) {
  const shape = useMemo(() => fingerprintShape(seed), [seed]);
  return (
    <figure className="hp-fp">
      <svg
        viewBox={`0 0 ${shape.size} ${shape.size}`}
        role="img"
        aria-label={strings.public.fingerprintLabel(shape.id)}
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
      <figcaption>{strings.public.fingerprint(shape.id)}</figcaption>
    </figure>
  );
}
