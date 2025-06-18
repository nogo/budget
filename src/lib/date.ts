import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { YearMonth } from "./yearmonth";
dayjs.extend(utc);

export function defaultDate(yearMonth?: YearMonth, day?: number): Date {
  let date = dayjs().startOf("day");

  if (yearMonth) {
    date = date.year(yearMonth.year).month(yearMonth.month - 1);
  }

  if (day) {
    if (day > date.daysInMonth()) {
      date = date.endOf("month");
    } else {
      date = date.date(day);
    }
  }

  return date.toDate();
}

export function formatIsoDate(dateString: Date): string {
  return dayjs(dateString).format("YYYY-MM-DD");
}
