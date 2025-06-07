import { Link } from "@tanstack/react-router";
import { Merge, Pencil, Trash } from "lucide-react";
import { Category } from "~/generated/db";
import { useTranslation } from "~/locales/translations";

interface CategoryItemProps {
  category?: Category;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category }) => {
  if (!category) return <></>;

  const t = useTranslation("CategoryItem");

  return (
    <div className="flex flex-row justify-between border-t border-gray-300 px-4 py-2">
      <span>
        {category.name}{" "}
        <span className="text-xs text-gray-400">
          {category.hasNotes && t(`withNotes`)}
        </span>
      </span>
      <div className="flex gap-4">
        <Link
          to="/categories/$categoryId/edit"
          params={{ categoryId: category.id.toString() }}
        >
          <Pencil className="h-5" />
        </Link>
        <Link
          to="/categories/$categoryId/merge"
          params={{ categoryId: category.id.toString() }}
        >
          <Merge className="h-5" />
        </Link>
        <Link
          to="/categories/$categoryId/remove"
          params={{ categoryId: category.id.toString() }}
          className="text-red-500"
        >
          <Trash className="h-5" />
        </Link>
      </div>
    </div>
  );
};

export default CategoryItem;
