import { PageHeader } from "@/components/layout/PageHeader";

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" subtitle="Configuracion general del sistema" />
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 text-sm text-slate-500 dark:text-slate-400">
        Preferencias, notificaciones y parametros globales.
      </div>
    </div>
  );
};

export default SettingsPage;
