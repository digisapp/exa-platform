import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ backHref, backLabel, title, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 mb-6", className)}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
