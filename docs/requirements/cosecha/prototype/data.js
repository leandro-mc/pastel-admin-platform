/* Cosecha · datos de EJEMPLO (todo ficticio). Productores, compradores y cifras no corresponden a personas reales. */
window.COSECHA_DATA = {
  org: "Asociación de Productores (ejemplo)",
  // id, nombre, zona, capacidad kg, déficit de equidad (+ = quedó corto), canal, teléfono, finca ha, última estimación (días), SINPE
  producers: [
    ["p1", "Don Mario", "Corredores", 120, 0.2, "wa", "88880001", 1.5, 3, "8888-0001"], ["p2", "Doña Lidia", "Osa", 90, 0.0, "wa", "88880002", 1.0, 9, "8888-0002"],
    ["p3", "Don Efraín", "Pérez Zeledón", 150, -0.1, "call", "88880003", 2.0, 2, "8888-0003"], ["p4", "Doña Karla", "Pococí", 60, 0.3, "wa", "88880004", 0.8, 5, "8888-0004"],
    ["p5", "Don Rafa", "Guácimo", 80, 0.0, "voice", "88880005", 1.2, 12, "8888-0005"], ["p6", "Doña Nuria", "Siquirres", 45, 0.1, "wa", "88880006", 0.7, 4, "8888-0006"],
    ["p7", "Don Beto", "Corredores", 100, -0.2, "link", "88880007", 1.6, 6, "—"], ["p8", "Doña Yamileth", "Osa", 35, 0.0, "wa", "88880008", 0.5, 1, "8888-0008"],
  ].map(([id, name, zone, w, def, ch, phone, ha, upd, sinpe]) => ({ id, name, zone, w, def, ch, phone, ha, upd, sinpe, cap: null, inc: true, st: "new" })),
  orders: [{ id: "o1", buyer: "Frutería La Esquina (ej.)", kg: 120, price: 1450, on: true }, { id: "o2", buyer: "Hotel Playa Ejemplo", kg: 200, price: 1350, on: true }, { id: "o3", buyer: "Mayorista Central (ej.)", kg: 160, price: 1250, on: true }],
  // entregas del pool (semana ya recibida): kg grado A, kg grado B
  deliveries: [["p1", 85, 7], ["p2", 60, 3], ["p3", 95, 5], ["p4", 35, 5], ["p5", 55, 5], ["p6", 30, 0], ["p7", 60, 0], ["p8", 20, 0]],
  pool: { week: "19–23 oct", costs: { flete: 60000, empaque: 48000, frio: 30000 }, fundPct: 3, mgmtPct: 8, advPct: 60, refPrice: 800, gradeB: 0.7 },
  weeks: [["3 nov", 0, 800000], ["10 nov", 650000, 300000], ["17 nov", 0, 1500000], ["24 nov", 1800000, 200000], ["1 dic", 0, 700000], ["8 dic", 900000, 500000], ["15 dic", 1200000, 0], ["22 dic", 0, 400000]],
  claims: [
    { id: "c1", buyer: "Frutería La Esquina (ej.)", lot: "RB-261022-P3", kg: 40, aff: 6, cause: "oscurecimiento", hours: 5, photos: 3, st: "nuevo", note: "Las espinas llegaron oscuras en dos cajas." },
    { id: "c2", buyer: "Hotel Playa Ejemplo", lot: "RB-261020-P1", kg: 200, aff: 4, cause: "golpes", hours: 20, photos: 1, st: "nuevo", note: "Avisaron al día siguiente." },
  ],
  stops: [
    { id: "s1", buyer: "Frutería La Esquina (ej.)", addr: "Heredia centro, local 4", win: "09:00–10:00", kg: 120, phone: "88880011", st: "pend", wait: 0 },
    { id: "s2", buyer: "Hotel Playa Ejemplo", addr: "Jacó, entrada de cocina", win: "12:00–13:00", kg: 200, phone: "88880012", st: "pend", wait: 0 },
    { id: "s3", buyer: "Mayorista Central (ej.)", addr: "Mercado mayorista, andén 7", win: "14:00–15:00", kg: 160, phone: "88880013", st: "pend", wait: 0 },
  ],
  users: [["Propietario (ejemplo)", "owner"], ["Gabriela (ejemplo)", "gestor"], ["Hugo (ejemplo)", "comercial"], ["Iván (ejemplo)", "acopio"], ["Jorge (ejemplo)", "transportista"], ["Karen (ejemplo)", "contabilidad"]],
  audit: ["2026-10-22 · Gabriela (gestor) cerró el envío del 22 oct", "2026-10-23 · Karen (contabilidad) exportó pagos de la semana", "2026-10-23 · Propietario invitó a Hugo (comercial) · vence 30 nov"],
};
