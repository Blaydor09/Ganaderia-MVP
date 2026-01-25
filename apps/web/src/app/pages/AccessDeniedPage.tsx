import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

const AccessDeniedPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sin acceso"
        subtitle="No tienes permisos para ver esta seccion."
        actions={
          <Button variant="outline" asChild>
            <Link to="/">Volver al dashboard</Link>
          </Button>
        }
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        Si crees que es un error, solicita permisos al administrador.
      </div>
    </div>
  );
};

export default AccessDeniedPage;
