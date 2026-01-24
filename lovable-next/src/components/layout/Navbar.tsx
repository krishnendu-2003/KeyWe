"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Wallet, Menu, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Swap", path: "/swap" },
  { label: "Pay", path: "/pay" },
  { label: "SMS", path: "/sms" },
  { label: "History", path: "/history" },
  { label: "Docs", path: "/docs" },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      <nav className="glass-nav px-2 py-2 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 font-bold text-lg tracking-tight"
        >
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold">K</span>
          </div>
          <span className="hidden sm:inline">KeyWe</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                pathname === item.path
                  ? "bg-foreground text-background"
                  : "hover:bg-secondary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full hover:bg-secondary transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          <Link
            href="/wallet"
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Wallet className="w-4 h-4" />
            <span>Connect</span>
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-full hover:bg-secondary transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-card mt-2 p-4 animate-slide-up">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                  pathname === item.path
                    ? "bg-foreground text-background"
                    : "hover:bg-secondary",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/wallet"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background text-sm font-medium mt-2"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
