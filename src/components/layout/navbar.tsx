import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Calculator,
  LogOut,
  NotepadTextDashed,
  Tag,
  Wallet,
} from "lucide-react";
import { authClient } from "~/lib/auth/client";
import { useTranslation } from "~/locales/translations";
import { Button } from "../ui/button";
import { AppVersion } from "./app-version";

const Navbar: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslation("navbar");

  const handleLogout = async () => {
    try {
      await authClient.signOut()

      queryClient.resetQueries();
      router.invalidate()
      router.navigate({ to: '/login' })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  };

  return (
    <nav className="fixed top-0 z-10 w-full bg-yellow-900 text-white shadow-2xl p-2">
      <div className="flex items-center justify-between gap-8 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="shrink-0 flex items-center gap-2 text-2xl font-bold capitalize"
          >
            <Wallet className="h-7" />
            <span>Budget</span>
          </Link>
          <AppVersion />
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/categories"
            className="flex items-center gap-1 text-sm p-3 hover:bg-yellow-700"
          >
            <Tag className="h-4" />
            <span className="max-md:hidden">{t("categories")}</span>
          </Link>
          <Link
            to="/templates"
            className="flex items-center gap-1 text-sm p-3 hover:bg-yellow-700"
          >
            <NotepadTextDashed className="h-4" />
            <span className="max-md:hidden">{t("templates")}</span>
          </Link>
          <Link
            to="/review"
            className="flex items-center gap-1 text-sm p-3 hover:bg-yellow-700"
          >
            <Calculator className="h-4" />
            <span className="max-md:hidden">{t("review")}</span>
          </Link>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="flex items-center gap-1 text-sm p-3"
          >
            <LogOut className="h-4" />
            <span className="max-md:hidden">{t("logout")}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
