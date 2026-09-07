import { parentsOf, siblingsOf, spouseOf } from "./graph";
import {
  NODE_HEIGHT,
  NODE_PAD_X,
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

// Extra vertical space opened above the sel threshold. The Basque branch
// above Martín María is lifted by this amount so the caserío reads as a
// break into the old, uncertain Basque-country lineage.
export const SEL_BREAK_GAP = 220;

// Gap kept between the sel node label and Martín María below it, so the
// break lands as empty space above the caserío rather than below it.
export const SEL_GAP_BELOW = 44;

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

export function selAnchorId(graph: FamilyGraph): PersonId | undefined {
  return (selContext(graph)?.anchors ?? [])[0] as PersonId | undefined;
}

// The Basque branch that sits above the sel threshold: Martín María's
// ancestry plus each ancestor's spouse and any visible siblings, limited to
// generations above the anchor. Visible siblings are kept so an expanded
// Basque sibling row stays aligned with its generation after the lift.
export function selBranchAbove(
  graph: FamilyGraph,
  anchorId: PersonId,
  gens: ReadonlyMap<PersonId, number>,
): Set<PersonId> {
  const branch = new Set<PersonId>();
  const anchorGen = gens.get(anchorId);
  if (anchorGen === undefined) {
    return branch;
  }
  const queue: PersonId[] = [...parentsOf(graph, anchorId)];
  while (queue.length > 0) {
    const id = queue.pop();
    if (id === undefined || branch.has(id)) {
      continue;
    }
    const gen = gens.get(id);
    if (gen === undefined || gen >= anchorGen) {
      continue;
    }
    branch.add(id);
    for (const parent of parentsOf(graph, id)) {
      queue.push(parent);
    }
    const spouse = spouseOf(graph, id);
    if (spouse !== undefined) {
      queue.push(spouse);
    }
    for (const sibling of siblingsOf(graph, id)) {
      queue.push(sibling);
    }
  }
  return branch;
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
  const width = measureLabelWidth(context.displayName);
  const x = anchor.x + anchor.width / 2 - width / 2;
  // Seat the caserío just above Martín María so the break gap opened above the
  // Basque branch lands as empty space between the caserío and the ancestors.
  const y = anchor.y - SEL_GAP_BELOW - NODE_HEIGHT;
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
