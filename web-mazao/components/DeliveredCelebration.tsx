"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PackageCheck } from "lucide-react";
import { Button } from "./ui/button";
import { formatAvax } from "@/lib/format";

export function DeliveredCelebration({
  open,
  amount,
  onClose,
}: {
  open: boolean;
  amount: bigint;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
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
        >
          <motion.div
            className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center shadow-lift"
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-cream shadow-[var(--shadow-gold)]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <PackageCheck className="h-8 w-8" strokeWidth={2.2} />
            </motion.div>
            <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Delivered and paid</h2>
            <p className="mt-1 text-sm text-ink-soft">Escrow released to the farmer</p>
            <p className="mt-4 font-mono text-2xl font-semibold text-gold tnum">{formatAvax(amount)} AVAX</p>
            <Button variant="primary" size="md" className="mt-6 w-full" onClick={onClose}>
              Done
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
