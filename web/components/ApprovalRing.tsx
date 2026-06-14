"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

/// The tactile 3-of-5 escrow visual: an arc that fills toward the threshold, with a tick per
/// required approval. Reads at a glance as "how many more approvals are needed".
export function ApprovalRing({
  approved,
  threshold,
  executed = false,
  size = 128,
}: {
  approved: number;
  threshold: number;
  executed?: boolean;
  size?: number;
}) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = executed ? 1 : Math.min(approved, threshold) / threshold;
  const offset = circumference * (1 - progress);

  const ticks = Array.from({ length: threshold }, (_, i) => {
    const angle = (-90 + (i / threshold) * 360) * (Math.PI / 180);
    return {
      filled: executed || i < approved,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={executed ? "var(--color-success)" : "var(--color-gold-bright)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <svg width={size} height={size} className="absolute inset-0">
        {ticks.map((t, i) => (
          <circle
            key={i}
            cx={t.x}
            cy={t.y}
            r={3.5}
            fill={t.filled ? "var(--color-surface)" : "var(--color-line-strong)"}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {executed ? (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-success text-cream">
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
        ) : (
          <div className="leading-none">
            <span className="font-display text-3xl font-semibold text-ink tnum">{approved}</span>
            <span className="font-display text-lg text-ink-faint tnum">/{threshold}</span>
          </div>
        )}
      </div>
    </div>
  );
}
