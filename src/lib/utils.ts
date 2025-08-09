import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod/v4";


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

export function handleAmountString(value: string) {
  try {
    return z.coerce.number().positive().parse(value);
  } catch (e) {
    return 0.0;
  }
}

export function calculateArithmetic(expression: string): number {
  try {
    // Replace German decimal delimiter (comma) with dot for JavaScript evaluation
    const normalized = expression.replace(/,/g, '.');
    // Keep only numbers and arithmetic operators
    const sanitized = normalized.replace(/[^0-9+\-*/.()]/g, '');
    if (!sanitized) return 0;
    
    const result = Function(`"use strict"; return (${sanitized})`)();
    return typeof result === 'number' && !isNaN(result) && result >= 0 ? result : 0;
  } catch (e) {
    return 0;
  }
}

export function handleIdStringArray(value: string | undefined): number[] | undefined {
  return value
    ? value
      .split(',')
      .map((id: string): number => parseInt(id))
      .filter((id: number): boolean => !isNaN(id))
    : undefined;
}