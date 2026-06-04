import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const BatchesPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lotes"
        subtitle="Gestión de lotes de medicamentos."
      />

      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <ClipboardList className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-700 dark:text-slate-200">
          Disponible próximamente
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          El módulo de Lotes se encuentra en desarrollo. Pronto podrás gestionar lotes de medicamentos, controlar vencimientos y existencias desde aquí.
        </p>
      </div>
    </div>
  );
};

export default BatchesPage;
