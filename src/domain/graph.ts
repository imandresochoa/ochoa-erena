import {
  asPersonId,
  DEFAULT_FOCUS_ID,
  type Certainty,
  type Edge,
  type FamilyGraph,
  type Person,
  type PersonId,
} from "./types";

export function personById(graph: FamilyGraph, id: PersonId): Person | undefined {
  return graph.people.find((person) => person.id === id);
}

export function requirePerson(graph: FamilyGraph, id: PersonId): Person {
  const person = personById(graph, id);
  if (!person) {
    throw new Error(`Unknown person ${id}`);
  }
  return person;
}

export function parentsOf(graph: FamilyGraph, id: PersonId): PersonId[] {
  return graph.edges
    .filter((edge) => edge.kind === "parent" && edge.to === id)
    .map((edge) => edge.from);
}

export function childrenOf(graph: FamilyGraph, id: PersonId): PersonId[] {
  return graph.edges
    .filter((edge) => edge.kind === "parent" && edge.from === id)
    .map((edge) => edge.to);
}

export function spouseOf(graph: FamilyGraph, id: PersonId): PersonId | undefined {
  const edge = graph.edges.find(
    (item) => item.kind === "spouse" && (item.from === id || item.to === id),
  );
  if (!edge) {
    return undefined;
  }
  return edge.from === id ? edge.to : edge.from;
}

export function siblingsOf(graph: FamilyGraph, id: PersonId): PersonId[] {
  const fromParents = new Set<PersonId>();
  for (const parent of parentsOf(graph, id)) {
    for (const child of childrenOf(graph, parent)) {
      if (child !== id) {
        fromParents.add(child);
      }
    }
  }
  for (const edge of graph.edges) {
    if (edge.kind !== "sibling") {
      continue;
    }
    if (edge.from === id) {
      fromParents.add(edge.to);
    }
    if (edge.to === id) {
      fromParents.add(edge.from);
    }
  }
  return [...fromParents];
}

export function parentEdge(
  graph: FamilyGraph,
  parent: PersonId,
  child: PersonId,
): Edge | undefined {
  return graph.edges.find(
    (edge) => edge.kind === "parent" && edge.from === parent && edge.to === child,
  );
}

export function spouseEdge(graph: FamilyGraph, a: PersonId, b: PersonId): Edge | undefined {
  return graph.edges.find(
    (edge) =>
      edge.kind === "spouse" &&
      ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)),
  );
}

export function visiblePeople(
  graph: FamilyGraph,
  focusId: PersonId,
  expandedIds: readonly PersonId[],
): Set<PersonId> {
  const visible = new Set<PersonId>([focusId]);
  const queue: PersonId[] = [focusId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      break;
    }
    for (const parent of parentsOf(graph, current)) {
      if (!visible.has(parent)) {
        visible.add(parent);
        queue.push(parent);
      }
      const spouse = spouseOf(graph, parent);
      if (spouse && parentsOf(graph, current).includes(spouse) && !visible.has(spouse)) {
        visible.add(spouse);
        queue.push(spouse);
      }
    }
  }
  for (const child of childrenOf(graph, focusId)) {
    visible.add(child);
  }
  const spouse = spouseOf(graph, focusId);
  if (spouse) {
    visible.add(spouse);
  }
  for (const expanded of expandedIds) {
    if (!visible.has(expanded)) {
      continue;
    }
    for (const sibling of siblingsOf(graph, expanded)) {
      visible.add(sibling);
    }
  }
  return visible;
}

export function canvasVisible(
  graph: FamilyGraph,
  focusId: PersonId,
  expandedIds: readonly PersonId[],
): Set<PersonId> {
  const visible = visiblePeople(graph, DEFAULT_FOCUS_ID, expandedIds);
  visible.add(focusId);
  for (const child of childrenOf(graph, focusId)) {
    visible.add(child);
  }
  const spouse = spouseOf(graph, focusId);
  if (spouse) {
    visible.add(spouse);
  }
  return visible;
}

export function expansionsToReveal(
  graph: FamilyGraph,
  targetId: PersonId,
): PersonId[] {
  const spine = visiblePeople(graph, DEFAULT_FOCUS_ID, []);
  if (spine.has(targetId)) {
    return [];
  }
  const revealers: PersonId[] = [];
  for (const sibling of siblingsOf(graph, targetId)) {
    if (spine.has(sibling) && !revealers.includes(sibling)) {
      revealers.push(sibling);
    }
  }
  return revealers;
}

export function hasExpandableSiblings(
  graph: FamilyGraph,
  id: PersonId,
  expandedIds: readonly PersonId[],
): boolean {
  if (expandedIds.includes(id)) {
    return false;
  }
  return siblingsOf(graph, id).length > 0;
}

export type ExpandControl = {
  kind: "plus" | "minus";
  side: "left" | "right";
};

function siblingExpandSide(
  graph: FamilyGraph,
  focusId: PersonId,
  id: PersonId,
  visible: Set<PersonId>,
): "left" | "right" {
  const spouse = spouseOf(graph, id);
  if (!spouse || !visible.has(spouse)) {
    return "left";
  }
  if (id === focusId) {
    return "left";
  }
  if (spouse === focusId) {
    return "right";
  }
  const child = childrenOf(graph, id).find(
    (item) => visible.has(item) && parentsOf(graph, item).includes(spouse),
  );
  if (!child) {
    return "left";
  }
  const first = parentsOf(graph, child).find((parent) => parent === id || parent === spouse);
  return first === id ? "left" : "right";
}

export function expandControl(
  graph: FamilyGraph,
  focusId: PersonId,
  id: PersonId,
  expandedIds: readonly PersonId[],
): ExpandControl | null {
  const visible = canvasVisible(graph, focusId, expandedIds);
  const side = siblingExpandSide(graph, focusId, id, visible);
  if (expandedIds.includes(id)) {
    return { kind: "minus", side };
  }
  if (siblingsOf(graph, id).some((sibling) => !visible.has(sibling))) {
    return { kind: "plus", side };
  }
  return null;
}

export function edgeCertainty(edge: Edge | undefined): Certainty {
  return edge?.certainty ?? "confirmed";
}

export function restoreView(): { expandedIds: PersonId[]; pan: { x: number; y: number } } {
  return { expandedIds: [], pan: { x: 0, y: 0 } };
}

export function asId(id: string): PersonId {
  return asPersonId(id);
}
