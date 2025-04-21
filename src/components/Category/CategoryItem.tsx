import { Link } from "@tanstack/react-router";
import {
  ArrowRightEndOnRectangleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { Category } from "~/generated/db";

interface CategoryItemProps {
  category?: Category;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category }) => {
  if (!category) return <></>;

  return (
    <div className="flex flex-row justify-between border-t border-gray-300 px-4 py-2">
      <span>
        {category.name}{" "}
        <span className="text-xs text-gray-400">
          {category.hasNotes && `with notes`}
        </span>
      </span>
      <div className="flex gap-4">
        <Link
          to="/categories/$categoryId/edit"
          params={{ categoryId: category.id.toString() }}
        >
          <PencilIcon className="h-5" />
        </Link>
        <Link
          to="/categories/$categoryId/merge"
          params={{ categoryId: category.id.toString() }}
        >
          <ArrowRightEndOnRectangleIcon className="h-5" />
        </Link>
        <Link
          to="/categories/$categoryId/remove"
          params={{ categoryId: category.id.toString() }}
          className="text-red-500"
        >
          <TrashIcon className="h-5" />
        </Link>
      </div>
    </div>
  );
};

export default CategoryItem;
