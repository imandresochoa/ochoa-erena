"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChevronLeftIcon } from "@/components/chevron-left-icon";
import { family } from "@/data/family";
import { fichaFromPerson, leftoverLinks } from "@/domain/ficha";
import { gradoLabel } from "@/domain/grado";
import type { Person, PersonId } from "@/domain/types";

type Props = {
  person: Person;
  focusId: PersonId;
  narrow: boolean;
  onBack: () => void;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function PersonPanel({ person, focusId, narrow, onBack }: Props) {
  const reduce = useReducedMotion();
  const ficha = fichaFromPerson(person);
  const leftover = leftoverLinks(ficha.links, ficha.sources);
  const grado = gradoLabel(family, focusId, person.id);
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
      aria-label={
        grado ? `Ficha de ${ficha.displayName}, ${grado}` : `Ficha de ${ficha.displayName}`
      }
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
        <div className="flex flex-col gap-1">
          <p className="type-title text-[var(--color-ink)]">{ficha.displayName}</p>
          {grado ? (
            <motion.p
              key={grado}
              className="type-title text-[var(--color-muted-ink)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)" }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0)" }}
              transition={{
                duration: reduce ? 0.16 : 0.24,
                ease: EASE_OUT,
              }}
            >
              {grado}
            </motion.p>
          ) : null}
          {ficha.lifeLine ? (
            <p className="type-title text-[var(--color-muted-ink)]">{ficha.lifeLine}</p>
          ) : null}
        </div>
        {ficha.summary ? (
          <div className="flex flex-col gap-1">
            <p className="type-title text-[var(--color-ink)]">Resumen</p>
            <p className="text-[var(--color-muted-ink)]">{ficha.summary}</p>
          </div>
        ) : null}
        {ficha.sources.length > 0 ? (
          <motion.div
            className="flex flex-col gap-1"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0)" }}
            transition={{
              duration: reduce ? 0.16 : 0.24,
              ease: EASE_OUT,
            }}
          >
            <p className="type-title text-[var(--color-ink)]">Fuentes</p>
            {ficha.sources.map((source, index) => (
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
            <p className="type-title text-[var(--color-ink)]">Enlaces de interés</p>
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
        {ficha.noticeMailto ? (
          <a href={ficha.noticeMailto} className="ink-btn w-fit px-4 py-2">
            Avisar a Andrés
          </a>
        ) : null}
      </div>
    </motion.aside>
  );
}
