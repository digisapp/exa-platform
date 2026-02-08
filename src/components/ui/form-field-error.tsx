import { cn } from "@/lib/utils";

interface FormFieldErrorProps {
  id: string;
  message?: string;
  className?: string;
}

export function FormFieldError({ id, message, className }: FormFieldErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className={cn("text-sm text-destructive mt-1", className)}
    >
      {message}
    </p>
  );
}
