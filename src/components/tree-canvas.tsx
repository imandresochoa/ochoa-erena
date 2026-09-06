"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PersonNode } from "@/components/person-node";
import { family } from "@/data/family";
import {
  collapsePath,
  expandPinId,
  firstPathPoint,
  pinExpandedLayout,
  plusOrigin,
} from "@/domain/expand-motion";
import { hasExpandableSiblings, requirePerson } from "@/domain/graph";
import { layoutPedigree } from "@/domain/layout";
import {
  addPan,
  classifyPointer,
  fichaPersonAfterPointer,
  wheelZoom,
} from "@/domain/view";
import {
  asPersonId,
  NODE_HEIGHT,
  type PedigreeLayout,
  type PersonId,
  type Vec,
} from "@/domain/types";

type Props = {
  focusId: PersonId;
  selectedId: PersonId | null;
  expandedIds: PersonId[];
  pan: Vec;
  zoom: number;
  entering: boolean;
  coarsePointer: boolean;
  onPan: (next: Vec) => void;
  onZoom: (zoom: number) => void;
  onSelect: (id: PersonId) => void;
  onExpand: (id: PersonId) => void;
};

function connectorKey(connector: PedigreeLayout["connectors"][number]): string {
  return `${connector.kind}:${connector.fromId}:${connector.toId}`;
}

export function TreeCanvas({
  focusId,
  selectedId,
  expandedIds,
  pan,
  zoom,
  entering,
  coarsePointer,
  onPan,
  onZoom,
  onSelect,
  onExpand,
}: Props) {
  const reduce = useReducedMotion();
  const packed = useMemo(
    () => layoutPedigree(family, focusId, expandedIds),
    [focusId, expandedIds],
  );
  const view = useRef<{
    key: string;
    layout: PedigreeLayout;
    expanded: PersonId[];
    pinId: PersonId | null;
  }>({ key: "", layout: packed, expanded: [], pinId: null });
  const enterOrigins = useRef(new Map<PersonId, { x: number; y: number }>());
  const connectorOrigins = useRef(new Map<string, { x: number; y: number }>());
  const seenConnectors = useRef(new Set<string>());
  const viewKey = `${focusId}|${expandedIds.join(",")}|${entering ? "1" : "0"}`;
  if (view.current.key !== viewKey) {
    const restaurar = !entering && view.current.expanded.length > 0 && expandedIds.length === 0;
    const pinId = restaurar ? null : expandPinId(view.current.expanded, expandedIds);
    view.current = {
      key: viewKey,
      layout:
        !entering && pinId
          ? pinExpandedLayout(view.current.layout, packed, pinId)
          : packed,
      expanded: [...expandedIds],
      pinId,
    };
  }
  const layout = view.current.layout;
  const pinId = view.current.pinId;
  const pinNode = pinId
    ? layout.nodes.find((node) => node.id === pinId)
    : undefined;
  const pinOrigin = pinNode ? plusOrigin(pinNode) : null;
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
    personId: PersonId | null;
  } | null>(null);
  const panned = useRef(false);
  const seenIds = useRef(new Set<PersonId>());
  const onPanRef = useRef(onPan);
  const onZoomRef = useRef(onZoom);
  const onSelectRef = useRef(onSelect);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const frame = useRef<HTMLDivElement>(null);
  onPanRef.current = onPan;
  onZoomRef.current = onZoom;
  onSelectRef.current = onSelect;
  panRef.current = pan;
  zoomRef.current = zoom;

  const known = seenIds.current;

  useEffect(() => {
    seenIds.current = new Set(layout.nodes.map((node) => node.id));
    seenConnectors.current = new Set(layout.connectors.map((item) => connectorKey(item)));
    for (const id of [...enterOrigins.current.keys()]) {
      if (!seenIds.current.has(id)) {
        enterOrigins.current.delete(id);
      }
    }
    for (const id of [...connectorOrigins.current.keys()]) {
      if (!seenConnectors.current.has(id)) {
        connectorOrigins.current.delete(id);
      }
    }
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
      if (event.type === "pointerup") {
        const id = fichaPersonAfterPointer(active.moved, active.personId);
        if (id) {
          onSelectRef.current(id);
        }
      }
      window.setTimeout(() => {
        panned.current = false;
      }, 0);
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey) {
        onZoomRef.current(wheelZoom(zoomRef.current, event.deltaY));
        return;
      }
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
        const host = target?.closest("[data-person-id]");
        const raw = host?.getAttribute("data-person-id");
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          pan,
          moved: false,
          personId: raw ? asPersonId(raw) : null,
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
            transform: `translate(${pan.x}px, ${pan.y - NODE_HEIGHT / 2}px) scale(${zoom})`,
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
            <AnimatePresence initial={false}>
              {layout.connectors.map((connector) => {
                const key = connectorKey(connector);
                const fresh = !entering && !seenConnectors.current.has(key);
                if (fresh && pinOrigin) {
                  connectorOrigins.current.set(key, pinOrigin);
                }
                const origin =
                  connectorOrigins.current.get(key) ??
                  pinOrigin ??
                  firstPathPoint(connector.d);
                const start = collapsePath(connector.d, origin);
                return (
                  <motion.path
                    key={key}
                    d={connector.d}
                    fill="none"
                    stroke="var(--color-line)"
                    strokeWidth="1"
                    strokeDasharray={connector.certainty === "hypothesis" ? "4 4" : undefined}
                    initial={
                      reduce || !fresh ? false : { d: start, opacity: 1 }
                    }
                    animate={{ d: connector.d, opacity: 1 }}
                    exit={
                      reduce
                        ? { opacity: 0 }
                        : { d: start, opacity: 0 }
                    }
                    transition={{
                      duration: reduce ? 0 : 0.45,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                  />
                );
              })}
            </AnimatePresence>
          </svg>
          <AnimatePresence initial={false}>
            {layout.nodes.map((placed) => {
              const person = people.get(placed.id) ?? requirePerson(family, placed.id);
              const fresh = !entering && known.size > 0 && !known.has(placed.id);
              if (fresh && pinOrigin) {
                enterOrigins.current.set(placed.id, pinOrigin);
              }
              const origin =
                enterOrigins.current.get(placed.id) ??
                pinOrigin ??
                plusOrigin(placed);
              return (
                <PersonNode
                  key={placed.id}
                  person={person}
                  placed={placed}
                  selected={placed.id === selectedId}
                  showPlus={hasExpandableSiblings(family, placed.id, expandedIds)}
                  coarsePointer={coarsePointer}
                  fresh={fresh}
                  origin={origin}
                  panned={panned}
                  onSelect={() => onSelect(placed.id)}
                  onExpand={() => onExpand(placed.id)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
      <div className="fog-edge" data-entering={entering ? "true" : "false"} />
    </div>
  );
}
