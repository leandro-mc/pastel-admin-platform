/**
 * Huella generativa: identidad visual sin foto, determinista por la semilla de la publicación (la entrega el servidor).
 * La misma semilla da siempre el mismo dibujo; cada publicación cambia la semilla y, con ella, la huella.
 */

function prng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export type FingerprintPath = {
  d: string;
  strokeWidth: number;
  dash: string | null;
};

export type FingerprintShape = {
  /** Identificador corto (6 hex) que se muestra al pie del dibujo. */
  id: string;
  size: number;
  paths: FingerprintPath[];
};

export function fingerprintShape(seed: string, size = 220): FingerprintShape {
  const r = prng(seed);
  const c = size / 2;
  const n = 21;
  const phases = [r() * 6.28, r() * 6.28, r() * 6.28];
  const freqs = [
    2 + Math.floor(r() * 2),
    3 + Math.floor(r() * 3),
    5 + Math.floor(r() * 3),
  ];
  const dx = (r() - 0.5) * 14;
  const dy = (r() - 0.5) * 18;
  const id = Math.floor(r() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, "0");

  const paths: FingerprintPath[] = [];
  for (let k = 1; k <= n; k++) {
    const radius = (k * (size / 2 - 5)) / n;
    const shift = (1 - k / n) * 0.9;
    const points: string[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const wobble =
        Math.sin(freqs[0]! * a + phases[0]! + k * 0.31) * 2.2 +
        Math.sin(freqs[1]! * a + phases[1]! - k * 0.2) * 1.4 +
        Math.sin(freqs[2]! * a + phases[2]!) * 0.8;
      const rr = radius + wobble * (0.4 + k / n);
      const x = c + dx * shift + rr * Math.cos(a) * 0.9;
      const y = c + dy * shift + rr * Math.sin(a) * 1.08;
      points.push(`${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const strokeWidth = Number((1.1 + r() * 0.5).toFixed(2));
    const dash =
      k < 6 ? `${(6 + r() * 30).toFixed(0)} ${(2 + r() * 6).toFixed(0)}` : null;
    paths.push({ d: points.join(""), strokeWidth, dash });
  }
  return { id, size, paths };
}
