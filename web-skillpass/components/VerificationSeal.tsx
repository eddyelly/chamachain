"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldX } from "lucide-react";

export function VerificationSeal({ status }: { status: "valid" | "revoked" | "unknown" }) {
  const valid = status === "valid";
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -18, scale: 1.5 }}
      animate={{ opacity: 1, rotate: -8, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 16 }}
      className="relative grid h-20 w-20 place-items-center rounded-full"
    >
      <span className={`absolute inset-0 rounded-full ${valid ? "foil" : "bg-invalid"}`} />
      <span className="absolute inset-1 rounded-full bg-surface" />
      {valid ? (
        <ShieldCheck className="relative h-9 w-9 text-valid" />
      ) : (
        <ShieldX className="relative h-9 w-9 text-invalid" />
      )}
    </motion.div>
  );
}
