"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChevronLeftIcon } from "@/components/chevron-left-icon";
import { escudoOchoaFicha } from "@/domain/escudo-ficha";

type Props = {
  narrow: boolean;
  onBack: () => void;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function EscudoPanel({ narrow, onBack }: Props) {
  const reduce = useReducedMotion();
  const hidden = reduce
    ? { opacity: 0 }
    : narrow
      ? { opacity: 0, transform: "translateY(100%)" }
      : { opacity: 0, transform: "translateX(100%)" };
  const shown = reduce
    ? { opacity: 1 }
    : narrow
      ? { opacity: 1, transform: "translateY(0)" }
      : { opacity: 1, transform: "translateX(0)" };

  return (
    <motion.aside
      aria-label={`Ficha de ${escudoOchoaFicha.title}`}
      className={`absolute z-30 flex flex-col overflow-hidden border-[var(--color-line)] bg-[rgb(244_242_239_/_0.8)] p-2.5 backdrop-blur-[15px] ${
        narrow
          ? "inset-x-0 bottom-0 max-h-[70dvh] border-t"
          : "top-0 right-0 h-full w-[min(518px,38vw)] border-l"
      }`}
      initial={hidden}
      animate={shown}
      exit={hidden}
      transition={{
        duration: reduce ? 0.2 : 0.26,
        ease: EASE_OUT,
      }}
    >
      <div className="sticky top-0 py-2.5">
        <button type="button" onClick={onBack} className="ghost-btn ficha-back">
          <span className="relative size-5 overflow-clip" aria-hidden="true">
            <ChevronLeftIcon />
          </span>
          Volver
        </button>
      </div>
      <div className="font-satoshi flex flex-1 flex-col gap-8 overflow-auto p-[25px] text-base leading-[1.4]">
        <p className="type-title text-[var(--color-ink)]">{escudoOchoaFicha.title}</p>
        <div className="flex flex-col gap-3">
          {escudoOchoaFicha.blocks.map((block, index) =>
            block.kind === "h" ? (
              <motion.p
                key={`${block.kind}-${index}`}
                className="type-title text-[var(--color-ink)]"
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0)" }}
                transition={{
                  duration: reduce ? 0.16 : 0.24,
                  ease: EASE_OUT,
                }}
              >
                {block.text}
              </motion.p>
            ) : (
              <motion.p
                key={`${block.kind}-${index}`}
                className="text-[var(--color-muted-ink)]"
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0)" }}
                transition={{
                  duration: reduce ? 0.16 : 0.24,
                  ease: EASE_OUT,
                }}
              >
                {block.text}
              </motion.p>
            ),
          )}
        </div>
      </div>
    </motion.aside>
  );
}
