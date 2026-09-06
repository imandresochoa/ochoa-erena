"use client";

import { motion, useReducedMotion } from "motion/react";
import { PlusIcon } from "@/components/plus-icon";
import type { Person, PlacedNode } from "@/domain/types";

type Props = {
  person: Person;
  placed: PlacedNode;
  selected: boolean;
  showPlus: boolean;
  coarsePointer: boolean;
  fresh: boolean;
  panned: { current: boolean };
  onSelect: () => void;
  onExpand: () => void;
};

export function PersonNode({
  person,
  placed,
  selected,
  showPlus,
  coarsePointer,
  fresh,
  panned,
  onSelect,
  onExpand,
}: Props) {
  const reduce = useReducedMotion();
  const plusOnSelect = coarsePointer && selected;

  return (
    <motion.div
      className="person-node group/node absolute"
      data-person-id={person.id}
      data-reduced={reduce ? "true" : "false"}
      style={{ left: placed.x, top: placed.y, width: placed.width, height: placed.height }}
      initial={
        fresh
          ? reduce
            ? { opacity: 0 }
            : { opacity: 0, transform: "translateX(-8px)" }
          : { opacity: 1, transform: "translateX(0px)" }
      }
      animate={{ opacity: 1, transform: "translateX(0px)" }}
      transition={{
        duration: reduce ? 0.2 : 0.22,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {showPlus ? (
        <button
          type="button"
          data-expand="true"
          data-on={plusOnSelect ? "true" : "false"}
          aria-label={`Mostrar hermanos de ${person.displayName}`}
          className="node-plus absolute top-1/2 right-full z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-end pr-[3px]"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            onExpand();
          }}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
          }}
        >
          <span className="plus-cut" aria-hidden="true" />
          <PlusIcon />
        </button>
      ) : null}
      <button
        type="button"
        data-selected={selected}
        className={`node-chip relative flex h-full w-full items-center justify-center px-4 py-2 text-center text-base leading-[1.4] whitespace-nowrap ${
          selected
            ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
            : "bg-[var(--color-node)] text-[var(--color-ink)]"
        }`}
        onClick={() => {
          if (panned.current) {
            return;
          }
          onSelect();
        }}
      >
        <span
          className={`node-corner pointer-events-none absolute -top-[5px] -right-[5px] h-[10.5px] w-[10.5px] border-t border-r ${
            selected ? "border-[var(--color-canvas)]" : "border-[var(--color-ink)]"
          }`}
          data-on={selected ? "true" : "false"}
        />
        <span
          className={`node-corner pointer-events-none absolute -bottom-[5px] -left-[5px] h-[10.5px] w-[10.5px] border-b border-l ${
            selected ? "border-[var(--color-canvas)]" : "border-[var(--color-ink)]"
          }`}
          data-on={selected ? "true" : "false"}
        />
        {person.displayName}
      </button>
    </motion.div>
  );
}
