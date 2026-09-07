"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChevronLeftIcon } from "@/components/chevron-left-icon";
import { leftoverLinks } from "@/domain/ficha";
import { NEBLINA_COPY, NEBLINA_LEAD_EMPHASIS } from "@/domain/neblina";
import type { FamilyContext } from "@/domain/types";

type Props = {
  context: FamilyContext;
  narrow: boolean;
  onBack: () => void;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function ContextPanel({ context, narrow, onBack }: Props) {
  const reduce = useReducedMotion();
  const leftover = leftoverLinks(context.links, context.sources);
  const [leadBefore, leadAfter] = NEBLINA_COPY.split(NEBLINA_LEAD_EMPHASIS);
  const history = context.history
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const riseIn = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)" },
    animate: reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0)" },
    transition: { duration: reduce ? 0.16 : 0.24, ease: EASE_OUT },
  };
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
      aria-label={`Ficha de ${context.displayName}`}
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
        <div className="flex flex-col gap-3">
          <p className="type-title text-[var(--color-ink)]">{context.displayName}</p>
          <motion.p className="text-[var(--color-muted-ink)]" {...riseIn}>
            {leadBefore}
            <strong>{NEBLINA_LEAD_EMPHASIS}</strong>
            {leadAfter}
          </motion.p>
        </div>
        {history.length > 0 ? (
          <motion.div className="flex flex-col gap-3" {...riseIn}>
            <p className="type-title text-[var(--color-ink)]">Historia</p>
            {history.map((part) => (
              <p key={part.slice(0, 24)} className="text-[var(--color-muted-ink)]">
                {part}
              </p>
            ))}
          </motion.div>
        ) : null}
        {context.vinculaciones.length > 0 ? (
          <motion.div className="flex flex-col gap-3" {...riseIn}>
            <p className="type-title text-[var(--color-ink)]">Vinculaciones</p>
            {context.vinculaciones.map((item) => (
              <p key={item.label} className="text-[var(--color-muted-ink)]">
                <span className="text-[var(--color-ink)]">{item.label}. </span>
                {item.note}
              </p>
            ))}
          </motion.div>
        ) : null}
        {context.sources.length > 0 ? (
          <motion.div className="flex flex-col gap-1" {...riseIn}>
            <p className="type-title text-[var(--color-ink)]">Fuentes</p>
            {context.sources.map((source, index) => (
              <motion.a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-muted-ink)] underline-offset-2 hover:underline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: reduce ? 0.16 : 0.24,
                  delay: reduce ? 0 : index * 0.02,
                  ease: EASE_OUT,
                }}
              >
                {source.label}
              </motion.a>
            ))}
          </motion.div>
        ) : null}
        {leftover.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="type-title text-[var(--color-ink)]">Enlaces</p>
            {leftover.map((link) =>
              link.href ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-muted-ink)] underline-offset-2 hover:underline"
                >
                  {link.label}
                </a>
              ) : (
                <p key={link.label} className="text-[var(--color-muted-ink)]">
                  {link.label}
                </p>
              ),
            )}
          </div>
        ) : null}
        <p className="sr-only">{NEBLINA_COPY}</p>
      </div>
    </motion.aside>
  );
}
