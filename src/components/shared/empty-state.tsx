import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick,
  children,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        {Icon ? (
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-md">{description}</CardDescription>
      </CardHeader>
      {(actionLabel || children) && (
        <CardContent className="flex flex-col items-center gap-3">
          {actionLabel ? (
            <Button type="button" variant="outline" onClick={onActionClick}>
              {actionLabel}
            </Button>
          ) : null}
          {children}
        </CardContent>
      )}
    </Card>
  );
}
