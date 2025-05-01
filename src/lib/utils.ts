import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function striped(index: number) {
  return index % 2 === 0 ? "bg-gray-100" : "";
}

export function colored(value: number) {
  return value < 0 ? "text-red-600" : "text-green-600";
}

export function colorFromString(str: string): string {
  // DJB2 hash
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const l = 0.7;
  const c = 0.15 + (Math.abs(hash) % 100) / 400; // wider chroma range
  const h = Math.abs(hash) % 360;
  return `oklch(${l} ${c} ${h})`;
}
