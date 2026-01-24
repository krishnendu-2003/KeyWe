"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/hooks/useTheme";

const LightRays = dynamic(() => import("@/components/LightRays"), {
  ssr: false,
});

interface BackgroundContainerProps {
  children: React.ReactNode;
}

export function BackgroundContainer({ children }: BackgroundContainerProps) {
  const { theme } = useTheme();

  return (
    <div className="relative min-h-screen">
      {/* Fixed background with light rays */}
      <div className="fixed-background">
        <LightRays
          raysOrigin="top-center"
          raysColor={theme === "dark" ? "#ffffff" : "#000000"}
          raysSpeed={0.5}
          lightSpread={0.6}
          rayLength={2.5}
          followMouse={true}
          mouseInfluence={0.05}
          noiseAmount={0}
          distortion={0}
          pulsating={false}
          fadeDistance={1.2}
          saturation={0}
        />
      </div>

      {/* Content layer */}
      <div className="content-layer">{children}</div>
    </div>
  );
}
