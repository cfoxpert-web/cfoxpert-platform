import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely (later classes win conflicts instead of
 * both being applied). Every component in components/ui should compose
 * classNames through this — never string-concatenate className props.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
