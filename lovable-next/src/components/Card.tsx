"use client";

import { ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/GlowingEffect";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "elevated";
  glowEffect?: boolean;
  style?: CSSProperties;
}

export function Card({
  children,
  className,
  variant = "default",
  glowEffect = false,
  style,
}: CardProps) {
  const baseStyles = "relative rounded-2xl";

  const variants = {
    default: "bg-card border border-border",
    glass: "glass-card",
    elevated: "elevated-card",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} style={style}>
      {glowEffect && (
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn("p-6 pb-0", className)}>{children}</div>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}
