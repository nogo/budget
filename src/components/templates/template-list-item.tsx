import { Link } from "@tanstack/react-router";
import { Calendar1Icon, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "~/lib/format";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/locales/translations";
import { Badge } from "../ui/badge";

interface Template {
  id: number;
  amount: number;
  day: number;
  type: "expense" | "income";
  category: string;
  note: string;
}

interface TemplateItemProps {
  selected: boolean;
  template: Template;
}

export function TemplateNoItem() {
  const t = useTranslation("templates");
  return (
    <div className="border-t border-gray-300 px-4 py-2 text-center">
      {t("noTemplate")}
    </div>
  );
}

const TemplateListItem: React.FC<TemplateItemProps> = ({
  selected,
  template,
}) => {
  if (!template) return <></>;

  const amountClass =
    template.type === "expense" ? "text-red-600" : "text-green-600";
  const selectedClass = selected ? "bg-gray-100" : "";

  return (
    <Link
      to="/templates/$templateId"
      params={{
        templateId: template.id.toString(),
      }}
      className={cn(
        amountClass,
        selectedClass,
        "flex flex-row justify-between border-b border-gray-300 pl-9 pr-3 py-2 hover:bg-gray-100",
      )}
    >
      <span className="flex flex-row gap-3">
        <Badge variant="outline">
          <Calendar1Icon /> {template.day}.
        </Badge>
        <span>
          {template.note != "" && <span>{template.note}</span>}
        </span>
      </span>
      <span className="text-right font-mono">
        {formatCurrency(template.amount)}
      </span>
    </Link>
  );
};

export default TemplateListItem;
