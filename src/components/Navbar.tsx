import { Link, useNavigate } from "@tanstack/react-router";
import { Calculator, LogOut, PowerOff, Tag, Wallet } from "lucide-react";
import { useTranslation } from "~/locales/translations";
import { Button } from "./ui/button";
import { authClient } from "~/lib/auth/client";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation("Navbar");

  const logout = async () => {
    await authClient.signOut();
    navigate({ to: "/login" });
  };

  return (
    <nav className="fixed top-0 z-10 w-full bg-yellow-900 text-white shadow-2xl">
      <div className="flex items-center justify-between gap-8 px-4 sm:px-6">
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

          <Button variant="ghost" onClick={logout}>
            <LogOut />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
