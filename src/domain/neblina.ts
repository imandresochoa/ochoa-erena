import { spouseOf } from "./graph";
import {
  NODE_HEIGHT,
  NODE_PAD_X,
  ROW_GAP,
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

export const NEBLINA_BAND_HEIGHT = 48;

function measureLabelWidth(name: string): number {
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
  if (nodes.length === 0) {
    return [];
  }
  const treeMin = Math.min(...nodes.map((node) => node.x));
  const treeMax = Math.max(...nodes.map((node) => node.x + node.width));
  const treeMid = (treeMin + treeMax) / 2;
  const placed: PlacedContext[] = [];
  const rowLeft = new Map<number, number>();
  let leadPlaced = false;
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
    const width = measureLabelWidth(context.displayName);
    const y = left.y - ROW_GAP / 2;
    if (!leadPlaced) {
      placed.push({
        id: context.id,
        x: treeMid - width / 2,
        y,
        width,
        height: NODE_HEIGHT,
      });
      leadPlaced = true;
      continue;
    }
    const start = rowLeft.get(left.y) ?? left.x;
    const x = start - SIBLING_GAP - width;
    rowLeft.set(left.y, x);
    placed.push({
      id: context.id,
      x,
      y,
      width,
      height: NODE_HEIGHT,
    });
  }
  return placed;
}

export function placeNeblina(
  labels: readonly Pick<PlacedContext, "x" | "y" | "width" | "height">[],
  tree: readonly { x: number; width: number }[] = [],
): PlacedNeblina | null {
  if (labels.length === 0) {
    return null;
  }
  const span = tree.length > 0 ? tree : labels;
  const minX = Math.min(...span.map((box) => box.x));
  const maxX = Math.max(...span.map((box) => box.x + box.width));
  const minY = Math.min(...labels.map((label) => label.y));
  return {
    x: minX,
    y: minY + NODE_HEIGHT - NEBLINA_BAND_HEIGHT,
    width: maxX - minX,
    height: NEBLINA_BAND_HEIGHT,
  };
}
