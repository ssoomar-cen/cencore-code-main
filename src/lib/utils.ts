import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to mm/dd/yyyy format.
 * Returns empty string for null, undefined, or BC null dates (year 0001).
 */
export function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "";
  
  try {
    const date = typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
    
    // Check if date is valid
    if (!isValid(date)) return "";
    
    // Check for BC null date (year 0001 or very old dates)
    if (date.getFullYear() <= 1) return "";
    
    return format(date, "MM/dd/yyyy");
  } catch {
    return "";
  }
}
