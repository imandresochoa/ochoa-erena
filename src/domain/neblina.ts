import { spouseOf } from "./graph";
import {
  NODE_HEIGHT,
  NODE_PAD_X,
  SIBLING_GAP,
  type FamilyContext,
  type FamilyGraph,
  type PlacedContext,
  type PlacedNeblina,
  type PlacedNode,
} from "./types";

export const NEBLINA_LEAD_BEFORE =
  "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el ";
export const NEBLINA_LEAD_EMPHASIS = "sel de Egiara";
export const NEBLINA_LEAD_AFTER = ".";
export const NEBLINA_COPY = `${NEBLINA_LEAD_BEFORE}${NEBLINA_LEAD_EMPHASIS}${NEBLINA_LEAD_AFTER}`;

export const NEBLINA_LEGEND_ID = "neblina" as const;
export const NEBLINA_LEGEND_LABEL = "neblina";

export const NEBLINA_PAD = 24;

function measureChipWidth(name: string): number {
  return NODE_PAD_X * 2 + Math.round(name.length * 8.32);
}

export function fogContexts(graph: FamilyGraph): FamilyContext[] {
  return (graph.contexts ?? []).filter(
    (context) => context.zone === "fog" && context.branch === "lateral",
  );
}

export function contextById(
  graph: FamilyGraph,
  id: string,
): FamilyContext | undefined {
  return (graph.contexts ?? []).find((context) => context.id === id);
}

export function placeContextNodes(
  graph: FamilyGraph,
  nodes: readonly PlacedNode[],
): PlacedContext[] {
  const placed: PlacedContext[] = [];
  const rowLeft = new Map<number, number>();
  for (const context of fogContexts(graph)) {
    const anchor = (context.anchors ?? [])
      .map((id) => nodes.find((node) => node.id === id))
      .find((node): node is PlacedNode => node !== undefined);
    if (!anchor) {
      continue;
    }
    const cluster: PlacedNode[] = [anchor];
    const spouseId = spouseOf(graph, anchor.id);
    const spouse = spouseId
      ? nodes.find((node) => node.id === spouseId)
      : undefined;
    if (spouse) {
      cluster.push(spouse);
    }
    const left = cluster.reduce((best, node) => (node.x < best.x ? node : best));
    const width = measureChipWidth(context.displayName);
    const start = rowLeft.get(left.y) ?? left.x;
    const x = start - SIBLING_GAP - width;
    rowLeft.set(left.y, x);
    placed.push({
      id: context.id,
      x,
      y: left.y,
      width,
      height: NODE_HEIGHT,
    });
  }
  return placed;
}

export function placeNeblina(
  chips: readonly Pick<PlacedContext, "x" | "y" | "width" | "height">[],
): PlacedNeblina | null {
  if (chips.length === 0) {
    return null;
  }
  const minX = Math.min(...chips.map((chip) => chip.x));
  const minY = Math.min(...chips.map((chip) => chip.y));
  const maxX = Math.max(...chips.map((chip) => chip.x + chip.width));
  const maxY = Math.max(...chips.map((chip) => chip.y + chip.height));
  return {
    x: minX - NEBLINA_PAD,
    y: minY - NEBLINA_PAD,
    width: maxX - minX + NEBLINA_PAD * 2,
    height: maxY - minY + NEBLINA_PAD * 2,
  };
}
