import type { PedigreeLayout, PersonId, PlacedNode } from "./types";

export function plusOrigin(
  node: PlacedNode,
  side: "left" | "right" = "left",
): { x: number; y: number } {
  return {
    x: side === "right" ? node.x + node.width : node.x,
    y: node.y + node.height / 2,
  };
}

export function expandPinId(
  previous: readonly PersonId[],
  next: readonly PersonId[],
): PersonId | null {
  const added = next.find((id) => !previous.includes(id));
  if (added) {
    return added;
  }
  const removed = previous.find((id) => !next.includes(id));
  return removed ?? null;
}

export function pinExpandedLayout(
  previous: PedigreeLayout,
  next: PedigreeLayout,
  pinId: PersonId,
): PedigreeLayout {
  const prevPin = previous.nodes.find((node) => node.id === pinId);
  const nextPin = next.nodes.find((node) => node.id === pinId);
  if (!prevPin || !nextPin) {
    return next;
  }
  const dx = prevPin.x - nextPin.x;
  const dy = prevPin.y - nextPin.y;
  if (dx === 0 && dy === 0) {
    return next;
  }
  return {
    nodes: next.nodes.map((node) => ({
      ...node,
      x: node.x + dx,
      y: node.y + dy,
    })),
    connectors: next.connectors.map((connector) => ({
      ...connector,
      d: shiftPath(connector.d, dx, dy),
    })),
    crests: next.crests.map((crest) => ({
      ...crest,
      x: crest.x + dx,
      y: crest.y + dy,
    })),
  };
}

export function firstPathPoint(d: string): { x: number; y: number } {
  const match = d.match(/-?[\d.]+/g);
  return { x: Number(match?.[0] ?? 0), y: Number(match?.[1] ?? 0) };
}

export function pathPoints(d: string): { x: number; y: number }[] {
  const tokens = d.trim().split(/[\s,]+/).filter(Boolean);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "M" || token === "L") {
      points.push({ x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) });
      i += 2;
    }
  }
  return points;
}

export function pathMidpoint(d: string): { x: number; y: number } {
  const points = pathPoints(d);
  if (points.length === 0) {
    return firstPathPoint(d);
  }
  if (points.length === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  }
  const mid = Math.floor((points.length - 1) / 2);
  const a = points[mid];
  const b = points[Math.min(mid + 1, points.length - 1)];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function collapsePath(d: string, origin: { x: number; y: number }): string {
  let index = 0;
  return d.replace(/-?[\d.]+/g, () => {
    const value = index % 2 === 0 ? origin.x : origin.y;
    index += 1;
    return String(value);
  });
}

function shiftPath(d: string, dx: number, dy: number): string {
  let index = 0;
  return d.replace(/-?[\d.]+/g, (token) => {
    const value = Number(token) + (index % 2 === 0 ? dx : dy);
    index += 1;
    return String(value);
  });
}
