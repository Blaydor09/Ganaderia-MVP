import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const ChartCard = ({
  eyebrow,
  title,
  children,
  footer,
  className,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) => (
  <Card className={className}>
    <CardHeader>
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {eyebrow}
      </p>
      <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </p>
    </CardHeader>
    <CardContent className="space-y-3">
      {children}
      {footer}
    </CardContent>
  </Card>
);
