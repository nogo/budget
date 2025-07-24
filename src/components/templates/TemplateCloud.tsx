import { useQuery } from "@tanstack/react-query";
import { templateQueries } from "~/service/queries";
import { formatCurrency } from "~/lib/format";
import { Button } from "../ui/button";
import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";
import { Calendar1Icon } from "lucide-react";

type Props = {
  categoryId: number;
  onClick: (template: Template) => void;
};

type Template = {
  id: number;
  amount: number;
  day: number;
  note: string;
  type: "expense" | "income";
};

function mergeTemplateData(template: Template) {
  if (template.note) {
    return template.note;
  }

  if (template.amount > 0.0) {
    return `(${template.day}.) ${formatCurrency(template.amount)}`;
  }

  return `(${template.day}.)`;
}

const TemplateCloud: React.FC<Props> = ({ categoryId, onClick }) => {
  const { data: templates } = useQuery(
    templateQueries.listByCategory(categoryId.toString()),
  );

  if (templates === undefined || templates.length === 0) {
    return <></>;
  }
  const amountClass = (template: Template) =>
    template.type === "expense" ? "text-red-600" : "text-green-600";

  return (
    <div className="flex flex-wrap gap-3 items-center pt-3">
      {templates?.map((template) => (
        <Button
          variant="outline"
          size="sm"
          className={cn("text-xs", amountClass(template))}
          onClick={(e) => {
            e.preventDefault();
            onClick(template);
          }}
          key={template.id}
        >
          {mergeTemplateData(template)}
        </Button>
      ))}
    </div>
  );
};

export default TemplateCloud;
