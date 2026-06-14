"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { formatEther } from "viem";

function trim(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const [whole, fraction = ""] = fixed.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const grouped = Number(whole).toLocaleString("en-US");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

/// Smoothly counts the pooled balance up to its new value so the money feels alive.
export function AnimatedAmount({
  wei,
  decimals = 4,
  className,
}: {
  wei: bigint;
  decimals?: number;
  className?: string;
}) {
  const target = Number(formatEther(wei));
  const [display, setDisplay] = useState(() => trim(target, decimals));
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(prev.current, target, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(trim(v, decimals)),
    });
    prev.current = target;
    return () => controls.stop();
  }, [target, decimals]);

  return (
    <span className={className} aria-label={`${trim(target, decimals)} AVAX`}>
      {display}
    </span>
  );
}
