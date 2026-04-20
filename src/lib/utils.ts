import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: any): string {
  if (!value) return "—";
  try {
    const str = String(value);
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(str);
    }
    if (isNaN(date.getTime())) return str;
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  } catch {
    return String(value);
  }
}
