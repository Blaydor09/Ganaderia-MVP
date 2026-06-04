import { ReactNode } from "react";

export const DashboardChartHeader = ({
  title,
  badge,
  action,
}: {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 pb-3">
    <div className="flex items-center gap-2">
      <h3 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      {badge}
    </div>
    {action}
  </div>
);
