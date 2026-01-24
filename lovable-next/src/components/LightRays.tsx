"use client";

import { memo } from "react";

const LightRays = memo(({ className = "" }: any) => {
  return <div className={`light-rays-container ${className}`.trim()} />;
});

LightRays.displayName = "LightRays";

export default LightRays;
