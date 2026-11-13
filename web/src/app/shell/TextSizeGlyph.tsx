/** «A» dibujada (no es texto): así el botón no lleva un texto visible distinto de su nombre accesible y escala por tamaño. */
export default function TextSizeGlyph({ px }: { px: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.5 4.5 20.5M12 3.5l7.5 17M7.6 14.5h8.8" />
    </svg>
  );
}
