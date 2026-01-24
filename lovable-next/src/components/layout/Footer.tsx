"use client";

import Link from "next/link";
import { Github, FileText, Shield, Mail } from "lucide-react";

const footerLinks = [
  { label: "Docs", path: "/docs", icon: FileText },
  { label: "Privacy", path: "/privacy", icon: Shield },
  { label: "GitHub", path: "https://github.com", icon: Github, external: true },
  {
    label: "Contact",
    path: "mailto:hello@keywepay.com",
    icon: Mail,
    external: true,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-background text-sm font-bold">K</span>
            </div>
            <div>
              <p className="font-semibold">KeyWe Pay</p>
              <p className="text-sm text-muted-foreground">
                Swap & Pay on Stellar
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            {footerLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.path}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              ),
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} KeyWe Pay. Built on Stellar.
          </p>
        </div>
      </div>
    </footer>
  );
}
