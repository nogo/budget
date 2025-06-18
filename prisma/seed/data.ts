import { TransactionType } from "~/generated/prisma/enums";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

// Helper to get a unix timestamp (seconds) for a given month offset and day
function getTimestamp(monthOffset: number, day: number) {
  return dayjs().subtract(monthOffset, "month").day(day).startOf("day").unix();
}

export const categories = [
  { name: "Groceries", hasNotes: false },
  { name: "Utilities", hasNotes: true },
  { name: "Salary", hasNotes: false },
  { name: "Transport", hasNotes: true },
  { name: "Leisure", hasNotes: false },
];

export const transactions = [
  // Month 1
  {
    amount: 50.25,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(0, 1),
    note: "Supermarket",
  },
  {
    amount: 120.0,
    type: TransactionType.expense,
    categoryId: 2,
    date: getTimestamp(0, 1),
    note: "Electricity bill",
  },
  {
    amount: 2000.0,
    type: TransactionType.income,
    categoryId: 3,
    date: getTimestamp(0, 1),
    note: "Monthly salary",
  },
  {
    amount: 15.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(0, 1),
    note: "Bus pass",
  },
  {
    amount: 30.0,
    type: TransactionType.expense,
    categoryId: 5,
    date: getTimestamp(0, 1),
    note: "Cinema",
  },

  {
    amount: 45.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(0, 2),
    note: "Groceries",
  },
  {
    amount: 10.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(0, 2),
    note: "Taxi",
  },
  {
    amount: 25.0,
    type: TransactionType.expense,
    categoryId: 5,
    date: getTimestamp(0, 2),
    note: "Bowling",
  },

  {
    amount: 60.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(0, 3),
    note: "Supermarket",
  },
  {
    amount: 100.0,
    type: TransactionType.expense,
    categoryId: 2,
    date: getTimestamp(0, 3),
    note: "Water bill",
  },
  {
    amount: 20.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(0, 3),
    note: "Train ticket",
  },

  // Month 2
  {
    amount: 55.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(1, 1),
    note: "Groceries",
  },
  {
    amount: 120.0,
    type: TransactionType.expense,
    categoryId: 2,
    date: getTimestamp(1, 1),
    note: "Gas bill",
  },
  {
    amount: 2000.0,
    type: TransactionType.income,
    categoryId: 3,
    date: getTimestamp(1, 1),
    note: "Monthly salary",
  },
  {
    amount: 18.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(1, 1),
    note: "Bus pass",
  },
  {
    amount: 40.0,
    type: TransactionType.expense,
    categoryId: 5,
    date: getTimestamp(1, 1),
    note: "Theater",
  },

  {
    amount: 48.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(1, 2),
    note: "Groceries",
  },
  {
    amount: 12.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(1, 2),
    note: "Taxi",
  },
  {
    amount: 22.0,
    type: TransactionType.expense,
    categoryId: 5,
    date: getTimestamp(1, 2),
    note: "Museum",
  },

  {
    amount: 62.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(1, 3),
    note: "Supermarket",
  },
  {
    amount: 105.0,
    type: TransactionType.expense,
    categoryId: 2,
    date: getTimestamp(1, 3),
    note: "Internet bill",
  },
  {
    amount: 19.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(1, 3),
    note: "Train ticket",
  },

  // Month 3
  {
    amount: 58.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(2, 1),
    note: "Groceries",
  },
  {
    amount: 130.0,
    type: TransactionType.expense,
    categoryId: 2,
    date: getTimestamp(2, 1),
    note: "Electricity bill",
  },
  {
    amount: 2000.0,
    type: TransactionType.income,
    categoryId: 3,
    date: getTimestamp(2, 1),
    note: "Monthly salary",
  },
  {
    amount: 17.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(2, 1),
    note: "Bus pass",
  },
  {
    amount: 35.0,
    type: TransactionType.expense,
    categoryId: 5,
    date: getTimestamp(2, 1),
    note: "Concert",
  },

  {
    amount: 50.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(2, 2),
    note: "Groceries",
  },
  {
    amount: 14.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(2, 2),
    note: "Taxi",
  },
  {
    amount: 28.0,
    type: TransactionType.expense,
    categoryId: 5,
    date: getTimestamp(2, 2),
    note: "Bowling",
  },

  {
    amount: 65.0,
    type: TransactionType.expense,
    categoryId: 1,
    date: getTimestamp(2, 3),
    note: "Supermarket",
  },
  {
    amount: 110.0,
    type: TransactionType.expense,
    categoryId: 2,
    date: getTimestamp(2, 3),
    note: "Water bill",
  },
  {
    amount: 21.0,
    type: TransactionType.expense,
    categoryId: 4,
    date: getTimestamp(2, 3),
    note: "Train ticket",
  },
];
