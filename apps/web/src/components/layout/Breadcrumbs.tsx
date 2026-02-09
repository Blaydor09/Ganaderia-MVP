import { Link, useLocation } from "react-router-dom";

const labelBySegment: Record<string, string> = {
  animals: "Animales",
  events: "Eventos",
  treatments: "Tratamientos",
  products: "Medicamentos",
  batches: "Lotes",
  inventory: "Inventario",
  movements: "Movimientos",
  establishments: "Establecimientos",
  reports: "Reportes",
  alerts: "Alertas",
  tasks: "Tareas",
  users: "Usuarios",
  audit: "Auditoria",
  settings: "Ajustes",
  onboarding: "Onboarding",
  quick: "Registro rapido",
  import: "Importar",
  new: "Nuevo",
  print: "Imprimir",
  login: "Ingreso",
  register: "Registro",
};

const isLikelyId = (segment: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment);

const toLabel = (segment: string) => {
  if (isLikelyId(segment)) return "Detalle";
  if (labelBySegment[segment]) return labelBySegment[segment];
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const to = `/${segments.slice(0, index + 1).join("/")}`;
    const label = toLabel(segment);
    return { to, label };
  });

  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
      <Link to="/" className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800">
        Inicio
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.to} className="flex items-center gap-2">
          <span>/</span>
          <Link
            to={crumb.to}
            className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800"
          >
            {crumb.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};
