export const reports = {
  title: "Reportes",
  description:
    "Resúmenes por envío, productor, comprador y temporada. Incluyen montos a productores y margen informativo.",
  kind: "Reporte",
  kinds: {
    shipments: "Por envío",
    producers: "Por productor",
    buyers: "Por comprador",
    season: "De la temporada",
  },
  from: "Desde",
  to: "Hasta",
  downloadCsv: "Descargar CSV",
  csvHint: "Se abre en Excel en español (separador «;», decimales con coma).",
  print: "Imprimir",
  empty: "No hay datos para este reporte con esos filtros.",
  generatedFor: (season: string) => `Temporada: ${season}`,
  allSeasons: "Todas las temporadas",
} as const;
