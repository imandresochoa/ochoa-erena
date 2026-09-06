"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { PersonNode } from "@/components/person-node";
import { family } from "@/data/family";
import { hasExpandableSiblings, requirePerson } from "@/domain/graph";
import { layoutPedigree } from "@/domain/layout";
import { addPan, classifyPointer } from "@/domain/view";
import { NODE_HEIGHT, type PersonId, type Vec } from "@/domain/types";

type Props = {
  focusId: PersonId;
  selectedId: PersonId | null;
  expandedIds: PersonId[];
  pan: Vec;
  entering: boolean;
  coarsePointer: boolean;
  onPan: (next: Vec) => void;
  onSelect: (id: PersonId) => void;
  onExpand: (id: PersonId) => void;
};

export function TreeCanvas({
  focusId,
  selectedId,
  expandedIds,
  pan,
  entering,
  coarsePointer,
  onPan,
  onSelect,
  onExpand,
}: Props) {
  const reduce = useReducedMotion();
  const layout = useMemo(
    () => layoutPedigree(family, focusId, expandedIds),
    [focusId, expandedIds],
  );
  const people = useMemo(
    () => new Map(family.people.map((person) => [person.id, person])),
    [],
  );
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    pan: Vec;
    moved: boolean;
  } | null>(null);
  const panned = useRef(false);
  const seenIds = useRef(new Set<PersonId>());
  const onPanRef = useRef(onPan);
  const panRef = useRef(pan);
  const frame = useRef<HTMLDivElement>(null);
  onPanRef.current = onPan;
  panRef.current = pan;

  const known = seenIds.current;

  useEffect(() => {
    seenIds.current = new Set(layout.nodes.map((node) => node.id));
  }, [layout]);

  useEffect(() => {
    const node = frame.current;
    if (!node) {
      return;
    }
    function onMove(event: PointerEvent) {
      const active = drag.current;
    if (!active || event.pointerId !== active.pointerId) {
        return;
      }
      const delta = { x: event.clientX - active.x, y: event.clientY - active.y };
      if (classifyPointer(delta) === "pan") {
        active.moved = true;
        panned.current = true;
        onPanRef.current(addPan(active.pan, delta));
      }
    }
    function onUp(event: PointerEvent) {
      const active = drag.current;
      if (!active || event.pointerId !== active.pointerId) {
        return;
      }
      drag.current = null;
      window.setTimeout(() => {
        panned.current = false;
      }, 0);
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      onPanRef.current(
        addPan(panRef.current, { x: -event.deltaX, y: -event.deltaY }),
      );
    }
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
      node.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div
      ref={frame}
      className="absolute inset-0 touch-none overflow-hidden select-none"
      style={{ touchAction: "none" }}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-expand]")) {
          return;
        }
        panned.current = false;
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          pan,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
    >
      <motion.div
        className="absolute inset-0"
        initial={
          reduce || !entering
            ? { opacity: 1, transform: "scale(1)" }
            : { opacity: 0, transform: "scale(0.96)" }
        }
        animate={{ opacity: 1, transform: "scale(1)" }}
        transition={{
          duration: reduce ? 0.2 : 0.4,
          ease: [0.23, 1, 0.32, 1],
        }}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            transform: `translate(${pan.x}px, ${pan.y - NODE_HEIGHT / 2}px)`,
          }}
        >
          <svg
            width="1"
            height="1"
            className="overflow-visible"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {layout.connectors.map((connector) => (
              <path
                key={`${connector.kind}-${connector.fromId}-${connector.toId}`}
                d={connector.d}
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="1"
                strokeDasharray={connector.certainty === "hypothesis" ? "4 4" : undefined}
              />
            ))}
          </svg>
          {layout.nodes.map((placed) => {
            const person = people.get(placed.id) ?? requirePerson(family, placed.id);
            return (
              <PersonNode
                key={placed.id}
                person={person}
                placed={placed}
                selected={placed.id === selectedId}
                showPlus={hasExpandableSiblings(family, placed.id, expandedIds)}
                coarsePointer={coarsePointer}
                fresh={!entering && known.size > 0 && !known.has(placed.id)}
                panned={panned}
                onSelect={() => onSelect(placed.id)}
                onExpand={() => onExpand(placed.id)}
              />
            );
          })}
        </div>
      </motion.div>
      <div className="fog-edge" data-entering={entering ? "true" : "false"} />
    </div>
  );
}
