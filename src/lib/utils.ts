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

/**
 * Sanitize user input for interpolation into a PostgREST `.or()` filter string,
 * where commas, parens, dots, quotes and braces are syntax. Strips those plus
 * ILIKE wildcards (%, _) and backslashes — letters, numbers, spaces, @, - and '
 * remain, which is enough for name/tag search.
 */
export function sanitizeOrFilterTerm(input: string): string {
  return input.replace(/[,()."{}\\%_]/g, "").trim();
}
