import { Activity } from "lucide-react";
import type { Audit } from "../types";

type AuditTabProps = {
  audit: Audit[];
};

function friendlyAction(value: string): string {
  return value.replaceAll(".", " · ").replaceAll("-", " ");
}

function readableDate(value: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AuditTab({ audit }: AuditTabProps) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Registro de auditoría</h2>
          <p>Eventos administrativos más recientes</p>
        </div>
        <span className="audit-badge">
          <Activity size={15} /> Solo lectura
        </span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Actor</th>
              <th>Recurso</th>
              <th>Dirección IP</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong className="audit-action">
                    {friendlyAction(item.action)}
                  </strong>
                </td>
                <td>{item.actorEmail || "Sistema"}</td>
                <td>{item.target || "—"}</td>
                <td className="muted-cell">{item.ipAddress || "—"}</td>
                <td className="muted-cell">{readableDate(item.createdAt)}</td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">
                  No hay eventos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
