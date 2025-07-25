import { Link } from "@tanstack/react-router";
import { Transaction } from "~/service/transactions.api";
import { formatCurrency } from "~/lib/format";
import { cn } from "~/lib/utils";
import { currentYearMonth, formatYearMonth } from "~/lib/yearmonth";

export interface MonthlyItemProps {
  selected: boolean;
  transaction: Transaction;
  searchQuery?: string;
}

const MonthlyListItem: React.FC<MonthlyItemProps> = ({
  selected,
  transaction,
  searchQuery
}) => {
  const yearMonth = currentYearMonth();
  const amountClass =
    transaction.type === "expense" ? "text-red-600" : "text-green-600";
  const selectedClass = selected ? "bg-gray-100" : "";

  return (
    <Link
      to="/$yearMonth/$id"
      id={transaction.id.toString()}
      search={{ q: searchQuery}}
      params={{
        yearMonth: formatYearMonth(yearMonth),
        id: transaction.id.toString(),
      }}
      className={cn(
        amountClass,
        selectedClass,
        "flex flex-row justify-between border-b border-gray-300 pl-9 pr-3 py-2 hover:bg-gray-100",
      )}
    >
      <span>
        {transaction.category}
        <span className="text-xs text-gray-400">
          {transaction.note && ` - ${transaction.note}`}
        </span>
      </span>
      <span className="text-right font-mono">
        {formatCurrency(transaction.amount)}
      </span>
    </Link>
  );
};

export default MonthlyListItem;
