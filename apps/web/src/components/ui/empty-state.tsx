import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <Card>
    <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
      <p className="font-medium text-slate-800 dark:text-slate-100">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {action}
    </CardContent>
  </Card>
);
