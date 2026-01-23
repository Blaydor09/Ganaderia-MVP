import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMe } from "@/lib/me";

const SettingsPage = () => {
  const { data: me } = useMe();

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" subtitle="Configuracion general del sistema" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900">Mi organizacion</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Nombre
              </span>
              <div className="font-medium text-slate-800">
                {me?.organization?.name ?? "Sin asignar"}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Slug
              </span>
              <div className="font-medium text-slate-800">
                {me?.organization?.slug ?? "-"}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900">Mi equipo</h3>
          <p className="mt-3 text-sm text-slate-600">
            Gestiona usuarios, roles y accesos desde la seccion de usuarios.
          </p>
          <Link
            className="mt-4 inline-flex text-sm font-medium text-brand-600 hover:underline"
            to="/users"
          >
            Ver usuarios
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
