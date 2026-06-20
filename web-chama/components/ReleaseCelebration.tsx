"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "./ui/button";
import { formatAvax } from "@/lib/format";

const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const distance = 130 + (i % 3) * 26;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: ["#e6b24c", "#1f635a", "#b4521f"][i % 3],
    delay: (i % 4) * 0.03,
  };
});

export function ReleaseCelebration({
  open,
  recipientLabel,
  amount,
  onClose,
}: {
  open: boolean;
  recipientLabel: string;
  amount: bigint;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 4600);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-primary-deep/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="alertdialog"
          aria-label="Malipo yametolewa"
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center shadow-lift"
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              {PARTICLES.map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
                  transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
                />
              ))}
            </div>

            <div className="relative">
              <motion.div
                className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success text-cream shadow-[var(--shadow-gold)]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              >
                <Check className="h-8 w-8" strokeWidth={2.5} />
              </motion.div>

              <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">
                Malipo yametolewa!
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Escrow released to the recipient</p>

              <div className="mt-5 rounded-2xl bg-cream px-4 py-3">
                <p className="font-mono text-2xl font-semibold text-gold tnum">
                  {formatAvax(amount)} AVAX
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink">kwa {recipientLabel}</p>
              </div>

              <Button variant="primary" size="md" className="mt-6 w-full" onClick={onClose}>
                Sawa
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
