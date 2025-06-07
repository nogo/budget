import { Link } from "@tanstack/react-router";
import { Calculator, Tag, Wallet } from "lucide-react";
import { useTranslation } from "~/locales/translations";

const Navbar: React.FC = () => {
  const t = useTranslation("Navbar");

  return (
    <div className="fixed top-0 z-10 w-full bg-yellow-900 text-white shadow-2xl">
      <div className="flex h-14 items-center justify-between gap-8 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="shrink-0 flex items-center gap-2 text-2xl font-bold capitalize"
          >
            <Wallet className="h-7" />
            <span>Budget</span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link
            to={"/categories"}
            className="flex items-center gap-1 text-sm p-3 hover:bg-yellow-700"
          >
            <Tag className="h-4" />
            <span className="max-md:hidden">{t("categories")}</span>
          </Link>
          <Link
            to={"/review"}
            className="flex items-center gap-1 text-sm p-3 hover:bg-yellow-700"
          >
            <Calculator className="h-4" />
            <span className="max-md:hidden">{t("review")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
