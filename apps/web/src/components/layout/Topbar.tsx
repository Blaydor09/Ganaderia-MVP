import { Bell } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";

export const Topbar = () => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <span className="hidden text-xs text-slate-500 md:block">
          Acceso rapido con / o Ctrl+K
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm">
          <span className="h-6 w-6 rounded-full bg-brand-600 text-white grid place-items-center text-xs">
            AD
          </span>
          <span className="text-slate-700">Admin</span>
        </div>
      </div>
    </div>
  );
};
