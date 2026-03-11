import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const ChartCard = ({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
  headerAction,
  contentClassName,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  contentClassName?: string;
}) => (
  <Card
    className={cn(
      "overflow-hidden border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 dark:border-slate-800 dark:from-slate-950/95 dark:to-slate-900/80",
      className
    )}
  >
    <CardHeader className="pb-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
          <div className="space-y-1">
            <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </p>
            {description ? (
              <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
        </div>
        {headerAction ? <div className="flex flex-wrap gap-2">{headerAction}</div> : null}
      </div>
    </CardHeader>
    <CardContent className={cn("space-y-4", contentClassName)}>
      {children}
      {footer}
    </CardContent>
  </Card>
);