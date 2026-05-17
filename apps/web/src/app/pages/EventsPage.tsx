import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const EventsPage = () => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Eventos"
        subtitle="Bitacora productiva y sanitaria"
      />
      
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <div className="rounded-full bg-slate-50 p-6 dark:bg-slate-800/50 mb-4">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">Modulo en construccion</h3>
        <p className="text-slate-500 dark:text-slate-400">Proximamente disponible...</p>
      </div>
    </div>
  );
};

export default EventsPage;
