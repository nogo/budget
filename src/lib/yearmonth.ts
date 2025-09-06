import { useParams } from "@tanstack/react-router";
import { z } from "zod";

export interface YearMonth {
  year: number;
  month: number;
}

const YearMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .transform((value) => {
    const result = value.split("-").map(Number);
    return {
      year: result[0],
      month: result[1],
    } as YearMonth;
  });

export function yearMonthNow(): YearMonth {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  } as YearMonth;
}

export function parseYearMonth(value: string): YearMonth {
  const result = YearMonthSchema.safeParse(value);

  if (!result.success) {
    return yearMonthNow();
  }

  return result.data;
}

export function currentYearMonth(): YearMonth {
  const { yearMonth } = useParams({ strict: false });

  if (!yearMonth) {
    return yearMonthNow();
  }

  return parseYearMonth(yearMonth);
}

export function previousYearMonth(value: YearMonth): YearMonth {
  if (!value) return yearMonthNow();

  if (value.month === 1) {
    return { year: value.year - 1, month: 12 };
  } else {
    return { year: value.year, month: value.month - 1 };
  }
}

export function nextYearMonth(value: YearMonth): YearMonth {
  if (!value) return yearMonthNow();

  if (value.month === 12) {
    return { year: value.year + 1, month: 1 };
  } else {
    return { year: value.year, month: value.month + 1 };
  }
}

export function formatYearMonth(value: YearMonth): string {
  if (value && value.year && value.month) {
    return `${value.year}-${value.month.toString().padStart(2, "0")}`;
  }
  // Return current year-month instead of empty string
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}-${month.toString().padStart(2, "0")}`;
}

export function formatDate(value: Date) {
  if (!value) return "";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
