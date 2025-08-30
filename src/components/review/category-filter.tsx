import React from "react";
import { useQuery } from "@tanstack/react-query";
import { categoryQueries } from "~/service/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";
import { useTranslation } from "~/locales/translations";

type CategoryFilterProps = {
  selectedCategoryIds: number[];
  onCategoryChange: (categoryIds: number[]) => void;
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategoryIds,
  onCategoryChange,
}) => {
  const t = useTranslation("Review");
  const { data: categories = [] } = useQuery(categoryQueries.list());

  const handleCategorySelect = (categoryIdStr: string) => {
    const categoryId = parseInt(categoryIdStr);
    if (categoryId && !selectedCategoryIds.includes(categoryId)) {
      onCategoryChange([...selectedCategoryIds, categoryId]);
    }
  };

  const handleRemoveCategory = (categoryId: number) => {
    onCategoryChange(selectedCategoryIds.filter(id => id !== categoryId));
  };

  const handleClearAll = () => {
    onCategoryChange([]);
  };

  const availableCategories = categories.filter(
    cat => !selectedCategoryIds.includes(cat.id)
  );

  const selectedCategories = categories.filter(
    cat => selectedCategoryIds.includes(cat.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value=""
          onValueChange={handleCategorySelect}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t("selectCategoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCategoryIds.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
          >
            {t("clearAll")}
          </Button>
        )}
      </div>

      {selectedCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <Badge
                key={category.id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                {category.name}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(category.id)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;