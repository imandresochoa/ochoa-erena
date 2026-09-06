import { childrenOf, edgeCertainty, parentEdge, parentsOf, personById, siblingsOf } from "./graph";
import type { Certainty, Edge, FamilyGraph, PersonId } from "./types";

export type FichaKinPerson = {
  id: PersonId;
  displayName: string;
  certainty: Certainty;
};

export type FichaKin = {
  parents: FichaKinPerson[];
  children: FichaKinPerson[];
  siblings: FichaKinPerson[];
};

export const FICHA_KIN_LABELS = {
  parents: "Padres",
  children: "Hijos",
  siblings: "Hermanos",
} as const;

export const FICHA_KIN_HYPOTHESIS = "hipótesis";

function siblingEdge(graph: FamilyGraph, a: PersonId, b: PersonId): Edge | undefined {
  return graph.edges.find(
    (edge) =>
      edge.kind === "sibling" &&
      ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)),
  );
}

function confirmedOnly(graph: FamilyGraph): FamilyGraph {
  return {
    people: graph.people,
    edges: graph.edges.filter((edge) => edge.certainty === "confirmed"),
  };
}

function shareParent(graph: FamilyGraph, a: PersonId, b: PersonId): boolean {
  const parentsOfB = new Set(parentsOf(graph, b));
  return parentsOf(graph, a).some((parent) => parentsOfB.has(parent));
}

function siblingCertainty(
  graph: FamilyGraph,
  confirmed: FamilyGraph,
  id: PersonId,
  sibling: PersonId,
): Certainty {
  const explicit = siblingEdge(graph, id, sibling);
  if (explicit) {
    return explicit.certainty;
  }
  return shareParent(confirmed, id, sibling) ? "confirmed" : "hypothesis";
}

function kinPeople(
  graph: FamilyGraph,
  ids: PersonId[],
  certaintyOf: (id: PersonId) => Certainty,
): FichaKinPerson[] {
  return ids.flatMap((id) => {
    const person = personById(graph, id);
    if (!person) {
      return [];
    }
    return [{ id: person.id, displayName: person.displayName, certainty: certaintyOf(id) }];
  });
}

export function fichaKin(graph: FamilyGraph, id: PersonId): FichaKin {
  const confirmed = confirmedOnly(graph);
  return {
    parents: kinPeople(graph, parentsOf(graph, id), (parent) =>
      edgeCertainty(parentEdge(graph, parent, id)),
    ),
    children: kinPeople(graph, childrenOf(graph, id), (child) =>
      edgeCertainty(parentEdge(graph, id, child)),
    ),
    siblings: kinPeople(graph, siblingsOf(graph, id), (sibling) =>
      siblingCertainty(graph, confirmed, id, sibling),
    ),
  };
}
