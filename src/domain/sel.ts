import { parentsOf } from "./graph";
import {
  NODE_HEIGHT,
  NODE_PAD_X,
  ROW_GAP,
  type FamilyContext,
  type FamilyGraph,
  type PersonId,
  type PlacedContext,
  type PlacedNode,
} from "./types";

export const SEL_ID = "sel-de-egiara";
export const SEL_LEAD_EMPHASIS = "sel de Egiara";
export const SEL_SUMMARY =
  "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el sel de Egiara.";

export const selImage = {
  src: "/sel/egiara-caserio.png",
  alt: "Caserío del sel de Egiara",
  width: 176,
  height: 176,
} as const;

function measureLabelWidth(name: string): number {
  return NODE_PAD_X * 2 + Math.round(name.length * 8.32);
}

export function contextById(
  graph: FamilyGraph,
  id: string,
): FamilyContext | undefined {
  return (graph.contexts ?? []).find((context) => context.id === id);
}

export function selContext(graph: FamilyGraph): FamilyContext | undefined {
  return contextById(graph, SEL_ID) ?? (graph.contexts ?? [])[0];
}

export function placeSelNode(
  graph: FamilyGraph,
  nodes: readonly PlacedNode[],
): PlacedContext[] {
  const context = selContext(graph);
  if (!context) {
    return [];
  }
  const anchorId = (context.anchors ?? [])[0] as PersonId | undefined;
  const anchor = anchorId
    ? nodes.find((node) => node.id === anchorId)
    : undefined;
  if (!anchor) {
    return [];
  }
  const parents = parentsOf(graph, anchor.id)
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is PlacedNode => node !== undefined);
  const width = measureLabelWidth(context.displayName);
  const x = anchor.x + anchor.width / 2 - width / 2;
  const y =
    parents.length > 0
      ? (Math.max(...parents.map((node) => node.y + node.height)) + anchor.y) /
          2 -
        NODE_HEIGHT / 2
      : anchor.y - ROW_GAP / 2;
  return [
    {
      id: context.id,
      x,
      y,
      width,
      height: NODE_HEIGHT,
    },
  ];
}
