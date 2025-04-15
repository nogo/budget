import { Link } from "@tanstack/react-router"
import { CalculatorIcon, TagIcon, UserIcon, WalletIcon } from "@heroicons/react/24/solid"

const Navbar: React.FC = () => {
  return (
    <div className="fixed top-0 z-10 w-full bg-yellow-900 text-white shadow-2xl">
      <div className="flex h-14 items-center justify-between gap-8 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="shrink-0 flex items-center gap-2 text-2xl font-bold capitalize">
            <WalletIcon className="h-7" />
            <span>Budget</span>
          </Link>
        </div>

        <div className="flex items-center gap-6 max-md:hidden">
          <Link to={"/categories"} className="flex items-center gap-1 text-sm">
            <TagIcon className="h-4" />
            <span>Categories</span>
          </Link>
          <Link to={"/review"} className="flex items-center gap-1 text-sm">
            <CalculatorIcon className="h-4" />
            <span>Review</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;