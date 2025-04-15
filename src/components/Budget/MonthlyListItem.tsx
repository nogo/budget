import { Link } from "@tanstack/react-router";
import { Transaction } from "~/service/transactions";
import { cn } from "~/utils/utils";
import { currentYearMonth, formatYearMonth } from "~/utils/yearmonth";

export interface MonthlyItemProps {
  selected: boolean;
  transaction: Transaction;
}

const MonthlyListItem: React.FC<MonthlyItemProps> = ({
  selected,
  transaction,
}) => {
  const yearMonth = currentYearMonth();
  const amountClass =
    transaction.type === "expense" ? "text-red-600" : "text-green-600";
  const selectedClass = selected ? "bg-gray-100" : "";

  return (
    <Link
      to="/$yearMonth/$id"
      id={transaction.id.toString()}
      params={{
        yearMonth: formatYearMonth(yearMonth),
        id: transaction.id.toString(),
      }}
      className={cn(
        amountClass,
        selectedClass,
        "flex flex-row justify-between border-t border-gray-300 px-4 py-2",
      )}
    >
      <span>
        {transaction.category}
        <span className="text-xs text-gray-400">
          {transaction.note && ` - ${transaction.note}`}
        </span>
      </span>
      <span className="text-right font-mono">{transaction.amount} €</span>
    </Link>
  );
};

export default MonthlyListItem;
