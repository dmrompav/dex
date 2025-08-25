import React from "react";
import ThemeToggle from "./ThemeToggle";
import viteLogo from "../../public/vite.svg";

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-gray-900 dark:bg-gray-950">
      <div className="flex items-center gap-3">
        <img src={viteLogo} alt="Logo" className="h-8 w-8" />
        <span className="text-xl font-bold text-white dark:text-white">
          Dexcelerate/Test
        </span>
      </div>
      <ThemeToggle />
    </header>
  );
};

export default Header;
