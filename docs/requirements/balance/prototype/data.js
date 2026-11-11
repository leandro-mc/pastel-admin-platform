/* Balance · datos de EJEMPLO (ficticios). Tres grupos para ver los casos que importan: un paseo con centavos que sobran (CRC),
   una casa con el grupo CERRADO y un viaje en yenes (moneda sin decimales). El orden de `members` ES el orden de alta (decide los centavos sobrantes). */
(function () {
  const people = { ana: "Ana", beto: "Beto", carla: "Carla", diego: "Diego", elena: "Elena", marcos: "Marcos" };
  const make = () => [
    { id: "g1", name: "Paseo a Manuel Antonio", description: "Fin de semana largo con la gente del trabajo.", currency: "CRC", tz: "America/Costa_Rica", closed: false,
      members: [{ id: "ana", role: "admin" }, { id: "diego", role: "admin" }, { id: "beto", role: "member" }, { id: "carla", role: "member" }, { id: "elena", role: "member" }],
      expenses: [
        { id: "e1", description: "Alquiler de la casa", payerId: "ana", amount: "180000.00", date: "2026-10-30" },
        { id: "e2", description: "Supermercado", payerId: "beto", amount: "45230.50", date: "2026-10-30" },
        { id: "e3", description: "Gasolina y peajes", payerId: "diego", amount: "38000.00", date: "2026-10-30" },
        { id: "e4", description: "Cena del sábado", payerId: "carla", amount: "62750.00", date: "2026-10-31" },
        { id: "e5", description: "Entradas al parque", payerId: "ana", amount: "27000.25", date: "2026-11-01" },
      ],
      join: { token: "paseo-7k3m9xq2", code: "4821" }, audit: [{ at: "2026-10-30 08:12", who: "Ana", what: "Creó el grupo" }] },
    { id: "g2", name: "Casa de Heredia", description: "Servicios de octubre. Ya se saldó.", currency: "CRC", tz: "America/Costa_Rica", closed: true,
      members: [{ id: "ana", role: "admin" }, { id: "beto", role: "member" }],
      expenses: [{ id: "e6", description: "Recibo de electricidad", payerId: "ana", amount: "31500.00", date: "2026-10-12" }, { id: "e7", description: "Internet y agua", payerId: "beto", amount: "24990.99", date: "2026-10-14" }],
      join: { token: "casa-q4w8e5r1", code: "7730" }, audit: [{ at: "2026-10-31 19:40", who: "Ana", what: "Cerró el grupo" }] },
    { id: "g3", name: "Viaje a Japón", description: "Gastos compartidos en yenes (la moneda no tiene decimales).", currency: "JPY", tz: "Asia/Tokyo", closed: false,
      members: [{ id: "beto", role: "admin" }, { id: "ana", role: "member" }, { id: "carla", role: "member" }],
      expenses: [{ id: "e8", description: "Tren bala a Kioto", payerId: "beto", amount: "1001", date: "2026-09-20" }, { id: "e9", description: "Cena de ramen", payerId: "ana", amount: "2", date: "2026-09-20" }],
      join: { token: "japon-m2n6b4v8", code: "1093" }, audit: [{ at: "2026-09-18 10:00", who: "Beto", what: "Creó el grupo" }] },
  ];
  const ZONES = [["America/Costa_Rica", "Costa Rica"], ["America/Mexico_City", "Ciudad de México"], ["America/Bogota", "Bogotá"], ["America/Panama", "Panamá"], ["America/New_York", "Nueva York"], ["America/Los_Angeles", "Los Ángeles"], ["Europe/Madrid", "Madrid"], ["Asia/Tokyo", "Tokio"], ["UTC", "UTC"]];
  // Roles de desarrollo → persona, sesión y acceso a Balance. `invitada` (sin cuenta) y `anon` no tienen persona.
  const ROLES = {
    admin: { me: "ana", session: true, access: true }, member: { me: "beto", session: true, access: true }, nueva: { me: "marcos", session: true, access: true },
    invitada: { me: null, session: false, access: false }, noaccess: { me: "marcos", session: true, access: false }, anon: { me: null, session: false, access: false },
  };
  window.BALANCE_DATA = { people, make, ZONES, ROLES, FEATURED: ["CRC", "USD", "EUR", "MXN", "COP", "ARS", "CLP", "UYU", "DOP", "PEN", "BRL", "GTQ", "HNL", "NIO", "PAB"] };
})();
