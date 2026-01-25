import { Link, useLocation } from "react-router-dom";

export const Breadcrumbs = () => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const to = `/${segments.slice(0, index + 1).join("/")}`;
    const label = segment.replace(/-/g, " ");
    return { to, label };
  });

  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
      <Link to="/" className="hover:text-brand-600">
        Inicio
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.to} className="flex items-center gap-2">
          <span>/</span>
          <Link to={crumb.to} className="hover:text-brand-600">
            {crumb.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};
