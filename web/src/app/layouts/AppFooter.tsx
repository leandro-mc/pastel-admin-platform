import { Flower2 } from "lucide-react";
import { Link, useLocation } from "react-router";
import { productModules } from "../modules";
import { routes } from "../routes";

/** Pie discreto del shell; no declara estados de salud que no haya consultado. */
export default function AppFooter() {
  const { pathname } = useLocation();
  const current = productModules.find((module) => pathname === module.basePath || pathname.startsWith(module.basePath + "/"));
  const home = current?.basePath ?? routes.home;
  return (
    <footer className="workspace-footer" data-module={current?.code}>
      <span>© {new Date().getFullYear()} Pastel Workspace</span>
      <span className="workspace-footer-slogan">Todo en su lugar. Todo fluye mejor.</span>
      <Link to={home} aria-label="Volver al inicio" className="workspace-footer-link">Hecho para crecer<Flower2 aria-hidden="true" size={15} /></Link>
    </footer>
  );
}
