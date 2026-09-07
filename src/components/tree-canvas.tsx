"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PersonNode } from "@/components/person-node";
import { family } from "@/data/family";
import {
  connectorDasharray,
  connectorStroke,
  paintConnectors,
} from "@/domain/connector-paint";
import { ochoaCrest } from "@/domain/crest";
import { contextById } from "@/domain/neblina";
import {
  collapsePath,
  expandPinId,
  firstPathPoint,
  pathMidpoint,
  pinExpandedLayout,
  plusOrigin,
} from "@/domain/expand-motion";
import { expandControl, requirePerson } from "@/domain/graph";
import { layoutHouseCanvas } from "@/domain/layout";
import {
  addPan,
  classifyPointer,
  fichaCrestAfterPointer,
  fichaPersonAfterPointer,
  pinchZoom,
  startPinch,
  wheelZoom,
  type PinchSession,
} from "@/domain/view";
import {
  NODE_HEIGHT,
  type CrestId,
  type PedigreeLayout,
  type PersonId,
  type Vec,
} from "@/domain/types";

type Props = {
  focusId: PersonId;
  selectedId: string | null;
  expandedIds: PersonId[];
  pan: Vec;
  zoom: number;
  entering: boolean;
  coarsePointer: boolean;
  onPan: (next: Vec) => void;
  onZoom: (zoom: number) => void;
  onSelect: (id: string) => void;
  onSelectCrest: (id: CrestId) => void;
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
  onSelectCrest,
  onExpand,
}: Props) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<{
    key: string;
    label: string;
    x: number;
    y: number;
  } | null>(null);
  const packed = useMemo(
    () => layoutHouseCanvas(family, focusId, expandedIds),
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
  const svgBounds = useMemo(() => {
    const boxes = [
      ...layout.nodes,
      ...layout.crests,
      ...layout.contextNodes,
      ...(layout.neblina ? [layout.neblina] : []),
    ];
    if (boxes.length === 0) {
      return { x: 0, y: 0, w: 1, h: 1 };
    }
    const pad = 24;
    const minX = Math.min(...boxes.map((box) => box.x)) - pad;
    const minY = Math.min(...boxes.map((box) => box.y)) - pad;
    const maxX = Math.max(...boxes.map((box) => box.x + box.width)) + pad;
    const maxY = Math.max(...boxes.map((box) => box.y + box.height)) + pad;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [layout]);
  const pinId = view.current.pinId;
  const pinNode = pinId
    ? layout.nodes.find((node) => node.id === pinId)
    : undefined;
  const pinOrigin = pinNode
    ? plusOrigin(
        pinNode,
        expandControl(family, focusId, pinNode.id, expandedIds)?.side ?? "left",
      )
    : null;
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
    fichaId: string | null;
    crestId: CrestId | null;
  } | null>(null);
  const pinch = useRef<PinchSession | null>(null);
  const panned = useRef(false);
  const seenIds = useRef(new Set<PersonId>());
  const onPanRef = useRef(onPan);
  const onZoomRef = useRef(onZoom);
  const onSelectRef = useRef(onSelect);
  const onSelectCrestRef = useRef(onSelectCrest);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const frame = useRef<HTMLDivElement>(null);
  onPanRef.current = onPan;
  onZoomRef.current = onZoom;
  onSelectRef.current = onSelect;
  onSelectCrestRef.current = onSelectCrest;
  panRef.current = pan;
  zoomRef.current = zoom;

  const known = seenIds.current;

  useEffect(() => {
    setHover(null);
  }, [viewKey]);

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
      if (pinch.current) {
        return;
      }
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
      if (event.type === "pointerup" && !pinch.current) {
        const id = fichaPersonAfterPointer(active.moved, active.fichaId);
        if (id) {
          onSelectRef.current(id);
        }
        const crestId = fichaCrestAfterPointer(active.moved, active.crestId);
        if (crestId) {
          onSelectCrestRef.current(crestId);
        }
      }
      window.setTimeout(() => {
        panned.current = false;
      }, 0);
    }
    function touchPoint(touch: Touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
    function onTouchStart(event: TouchEvent) {
      if (event.touches.length < 2) {
        return;
      }
      event.preventDefault();
      const session = startPinch(
        touchPoint(event.touches[0]),
        touchPoint(event.touches[1]),
        zoomRef.current,
      );
      const captured = drag.current;
      drag.current = null;
      pinch.current = session;
      const canvas = frame.current;
      if (captured && canvas && canvas.hasPointerCapture(captured.pointerId)) {
        canvas.releasePointerCapture(captured.pointerId);
      }
    }
    function onTouchMove(event: TouchEvent) {
      const session = pinch.current;
      if (!session || event.touches.length < 2) {
        return;
      }
      event.preventDefault();
      onZoomRef.current(
        pinchZoom(session, touchPoint(event.touches[0]), touchPoint(event.touches[1])),
      );
    }
    function onTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) {
        pinch.current = null;
      }
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      if (pinch.current) {
        return;
      }
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
    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    node.addEventListener("touchcancel", onTouchEnd);
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
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
        const host = target?.closest("[data-person-id], [data-context-id]");
        const raw =
          host?.getAttribute("data-person-id") ??
          host?.getAttribute("data-context-id");
        const crestHost = target?.closest("[data-crest-id]");
        const crestRaw = crestHost?.getAttribute("data-crest-id");
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          pan,
          moved: false,
          fichaId: raw ?? null,
          crestId: crestRaw === "ochoa" ? crestRaw : null,
        };
        if (event.pointerType !== "touch") {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
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
            width={svgBounds.w}
            height={svgBounds.h}
            viewBox={`${svgBounds.x} ${svgBounds.y} ${svgBounds.w} ${svgBounds.h}`}
            className="overflow-visible"
            style={{
              position: "absolute",
              left: svgBounds.x,
              top: svgBounds.y,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <AnimatePresence initial={false}>
              {paintConnectors(
                layout.connectors,
                (connector) => connectorKey(connector) === hover?.key,
              ).map((connector) => {
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
                const mid = pathMidpoint(connector.d);
                const hovered = hover?.key === key;
                return (
                  <motion.g
                    key={key}
                    style={{ zIndex: hovered ? 1 : 0 }}
                    initial={reduce || !fresh ? false : { opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: reduce ? 0 : 0.3,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                  >
                    <motion.path
                      d={connector.d}
                      fill="none"
                      stroke={connectorStroke(hovered)}
                      strokeWidth={connector.kind === "spouse" ? 2 : 1}
                      strokeDasharray={connectorDasharray({
                        kind: connector.kind,
                        certainty: connector.certainty,
                        parentBirthYear:
                          connector.kind === "parent"
                            ? people.get(connector.fromId)?.birth?.year
                            : undefined,
                        childBirthYear:
                          connector.kind === "parent"
                            ? people.get(connector.toId)?.birth?.year
                            : undefined,
                      })}
                      initial={reduce || !fresh ? false : { d: start }}
                      animate={{ d: connector.d }}
                      transition={{
                        duration: reduce ? 0 : 0.3,
                        ease: [0.23, 1, 0.32, 1],
                      }}
                    />
                    <path
                      d={connector.d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="16"
                      style={{ pointerEvents: "stroke" }}
                      aria-label={connector.label}
                      onPointerEnter={() =>
                        setHover({
                          key,
                          label: connector.label,
                          x: mid.x,
                          y: mid.y,
                        })
                      }
                      onPointerLeave={() =>
                        setHover((current) => (current?.key === key ? null : current))
                      }
                    />
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>
          {hover ? (
            <motion.div
              className="vinculo-tip pointer-events-none absolute z-30"
              style={{
                left: hover.x,
                top: hover.y,
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: reduce ? 0 : 0.18,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              {hover.label}
            </motion.div>
          ) : null}

          {layout.neblina
            ? (() => {
                const lead = layout.contextNodes[0];
                const gap = lead ? 20 : 0;
                const leftWidth = lead
                  ? Math.max(0, lead.x - gap - layout.neblina.x)
                  : layout.neblina.width;
                const rightLeft = lead
                  ? lead.x + lead.width + gap
                  : layout.neblina.x;
                const rightWidth = lead
                  ? Math.max(
                      0,
                      layout.neblina.x + layout.neblina.width - rightLeft,
                    )
                  : 0;
                const fade = {
                  initial: { opacity: reduce ? 1 : 0 },
                  animate: { opacity: 1 },
                  transition: {
                    duration: reduce ? 0 : 0.24,
                    ease: [0.23, 1, 0.32, 1] as const,
                  },
                };
                return (
                  <>
                    <motion.div
                      className="neblina pointer-events-none absolute neblina-left"
                      style={{
                        left: layout.neblina.x,
                        top: layout.neblina.y,
                        width: leftWidth,
                        height: layout.neblina.height,
                      }}
                      {...fade}
                    />
                    {rightWidth > 0 ? (
                      <motion.div
                        className="neblina pointer-events-none absolute neblina-right"
                        style={{
                          left: rightLeft,
                          top: layout.neblina.y,
                          width: rightWidth,
                          height: layout.neblina.height,
                        }}
                        {...fade}
                      />
                    ) : null}
                  </>
                );
              })()
            : null}
          {layout.contextNodes.map((placed) => {
            const context = contextById(family, placed.id);
            const label = context?.displayName || "Sel de Egiara";
            return (
              <motion.div
                key={placed.id}
                className="context-node absolute z-10"
                data-context-id={placed.id}
                style={{
                  left: 0,
                  top: 0,
                  width: placed.width,
                  height: placed.height,
                }}
                initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1, x: placed.x, y: placed.y }}
                transition={{
                  duration: reduce ? 0 : 0.3,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <button
                  type="button"
                  data-selected={placed.id === selectedId}
                  className="context-label relative flex h-full w-full items-center justify-center text-center text-base leading-[1.4] whitespace-nowrap"
                  onClick={() => {
                    if (panned.current) {
                      return;
                    }
                    onSelect(placed.id);
                  }}
                >
                  {label}
                </button>
              </motion.div>
            );
          })}

          {layout.crests.map((crest) => (
            <button
              key={crest.id}
              type="button"
              data-crest-id={crest.id}
              aria-label="Abrir la ficha del escudo Ochoa de Eguiara"
              className="crest-btn absolute"
              style={{ left: crest.x, top: crest.y, width: crest.width, height: crest.height }}
              onClick={() => {
                if (panned.current) return;
                onSelectCrest(crest.id);
              }}
            >
              <Image
                src={ochoaCrest.src}
                alt={ochoaCrest.alt}
                width={crest.width}
                height={crest.height}
                sizes={`${crest.width}px`}
                className="h-full w-full object-contain"
                priority
              />
            </button>
          ))}
          <AnimatePresence initial={false}>
            {layout.nodes.map((placed) => {
              const person = people.get(placed.id) ?? requirePerson(family, placed.id);
              const fresh = !entering && known.size > 0 && !known.has(placed.id);
              if (fresh && pinOrigin) {
                enterOrigins.current.set(placed.id, pinOrigin);
              }
              const control = expandControl(family, focusId, placed.id, expandedIds);
              const origin =
                enterOrigins.current.get(placed.id) ??
                pinOrigin ??
                plusOrigin(placed, control?.side ?? "left");
              return (
                <PersonNode
                  key={placed.id}
                  person={person}
                  placed={placed}
                  selected={placed.id === selectedId}
                  expand={control}
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
