import { parentsOf } from "./graph";
import type { FamilyGraph, PersonId, PlacedNode } from "./types";

export const NEBLINA_COPY =
  "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el sel de Egiara.";

export const NEBLINA_LEGEND_ID = "neblina" as const;
export const NEBLINA_LEGEND_LABEL = "neblina";

export const NEBLINA_GAP = 8;
export const NEBLINA_HEIGHT = 64;
export const NEBLINA_MIN_WIDTH = 320;

const EGUIARA_NAME = /ochoa de (eguiara|eguiyara|egiara)/i;

export function isOchoaDeEguiaraName(displayName: string): boolean {
  return EGUIARA_NAME.test(displayName);
}

export function neblinaRoots(graph: FamilyGraph): PersonId[] {
  return graph.people
    .filter(
      (person) =>
        isOchoaDeEguiaraName(person.displayName) &&
        parentsOf(graph, person.id).length === 0,
    )
    .map((person) => person.id);
}

export function showsNeblinaCopy(graph: FamilyGraph, personId: PersonId): boolean {
  return neblinaRoots(graph).includes(personId);
}

export function placeNeblina(
  nodes: readonly PlacedNode[],
  rootIds: readonly PersonId[],
): { x: number; y: number; width: number; height: number } | null {
  const roots = nodes.filter((node) => rootIds.includes(node.id));
  if (roots.length === 0) {
    return null;
  }
  const minX = Math.min(...roots.map((node) => node.x));
  const maxX = Math.max(...roots.map((node) => node.x + node.width));
  const minY = Math.min(...roots.map((node) => node.y));
  const span = maxX - minX;
  const width = Math.max(span, NEBLINA_MIN_WIDTH);
  return {
    x: (minX + maxX) / 2 - width / 2,
    y: minY - NEBLINA_GAP - NEBLINA_HEIGHT,
    width,
    height: NEBLINA_HEIGHT,
  };
}
