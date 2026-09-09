"use client";

import { motion } from "motion/react";
import { boot, bootItem } from "@/lib/motion";

/** moment 1 — the instrument powering on. Once per navigation, <=450ms. */
export function Boot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={boot} initial="hidden" animate="shown" className={className}>
      {children}
    </motion.div>
  );
}

export function BootItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={bootItem} className={className}>
      {children}
    </motion.div>
  );
}
