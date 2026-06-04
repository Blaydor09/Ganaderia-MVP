import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ChartCard = ({
  title,
  badge,
  children,
  footer,
  className,
  headerAction,
  // Legacy props for backward compatibility (ignored if not needed)
  eyebrow: _eyebrow,
  description: _description,
  contentClassName,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  eyebrow?: string;
  description?: string;
  contentClassName?: string;
}) => (
  <div className={cn("dash-card overflow-hidden", className)}>
    {/* Compact header */}
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </h3>
        {badge}
      </div>
      {headerAction}
    </div>

    {/* Content */}
    <div className={cn("space-y-3 px-4 pb-4", contentClassName)}>
      {children}
      {footer}
    </div>
  </div>
);