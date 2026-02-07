import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape special Postgres ILIKE characters (%, _, \) in user input
 * to prevent wildcard injection in search queries.
 */
export function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}
