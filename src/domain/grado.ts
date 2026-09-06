import {
  childrenOf,
  parentsOf,
  personById,
  requirePerson,
  siblingsOf,
  spouseOf,
} from "./graph";
import { asPersonId, type FamilyGraph, type Person, type PersonId } from "./types";
import { type Sex, sexOfPerson } from "./vinculo";

const DEFAULT_FOCUS_ID = asPersonId("andres-martin-ochoa-erena");

type Hop = "U" | "D" | "S" | "H";

type Step = { hop: Hop; from: PersonId; to: PersonId };

type Forms = readonly [male: string, female: string, unknown: string];

const DEFAULT_FOCUS_SHORT_NAME = "Andrés";

const ANCESTORS: readonly Forms[] = [
  ["Padre", "Madre", "Padre/madre"],
  ["Abuelo", "Abuela", "Abuelo/a"],
  ["Bisabuelo", "Bisabuela", "Bisabuelo/a"],
  ["Tatarabuelo", "Tatarabuela", "Tatarabuelo/a"],
  ["Trastatarabuelo", "Trastatarabuela", "Trastatarabuelo/a"],
  ["Quinto abuelo", "Quinta abuela", "Quinto/a abuelo/a"],
  ["Sexto abuelo", "Sexta abuela", "Sexto/a abuelo/a"],
];

const DESCENDANTS: readonly Forms[] = [
  ["Hijo", "Hija", "Hijo/a"],
  ["Nieto", "Nieta", "Nieto/a"],
  ["Bisnieto", "Bisnieta", "Bisnieto/a"],
  ["Tataranieto", "Tataranieta", "Tataranieto/a"],
];

const UNCLES: readonly Forms[] = [
  ["Tío", "Tía", "Tío/a"],
  ["Tío-abuelo", "Tía-abuela", "Tío/a-abuelo/a"],
  ["Tío-bisabuelo", "Tía-bisabuela", "Tío/a-bisabuelo/a"],
];

const SIBLING: Forms = ["Hermano", "Hermana", "Hermano/a"];

const OF_GREAT_UNCLE: Forms = [
  "del tío-bisabuelo",
  "de la tía-bisabuela",
  "del/de la tío/a-bisabuelo/a",
];

function inflect(forms: Forms, sex: Sex | undefined): string {
  if (sex === "m") {
    return forms[0];
  }
  if (sex === "f") {
    return forms[1];
  }
  return forms[2];
}

function inflectGeneration(
  table: readonly Forms[],
  generation: number,
  sex: Sex | undefined,
): string | null {
  const forms = table[generation - 1];
  return forms ? inflect(forms, sex) : null;
}

function step(hop: Hop, from: PersonId, to: PersonId): Step {
  return { hop, from, to };
}

function stepsFrom(graph: FamilyGraph, from: PersonId): Step[] {
  const spouse = spouseOf(graph, from);
  return [
    ...parentsOf(graph, from).map((to) => step("U", from, to)),
    ...childrenOf(graph, from).map((to) => step("D", from, to)),
    ...(spouse ? [step("S", from, spouse)] : []),
    ...siblingsOf(graph, from).map((to) => step("H", from, to)),
  ];
}

function shortestPath(graph: FamilyGraph, from: PersonId, to: PersonId): Step[] | null {
  const arrivals = new Map<PersonId, Step>();
  const queue: PersonId[] = [from];
  for (let index = 0; index < queue.length && !arrivals.has(to); index += 1) {
    for (const next of stepsFrom(graph, queue[index])) {
      if (next.to !== from && !arrivals.has(next.to)) {
        arrivals.set(next.to, next);
        queue.push(next.to);
      }
    }
  }
  const path: Step[] = [];
  for (let current = arrivals.get(to); current; current = arrivals.get(current.from)) {
    path.unshift(current);
  }
  return path.length > 0 ? path : null;
}

function termFor(graph: FamilyGraph, path: Step[]): string | null {
  const shape = path.map((item) => item.hop).join("");
  const sexAt = (index: number) => sexOfPerson(personById(graph, path[index].to));
  const target = sexAt(path.length - 1);
  if (shape === "S") {
    return "Cónyuge";
  }
  if (shape === "H") {
    return inflect(SIBLING, target);
  }
  const ancestors = /^S?(U+)$/.exec(shape);
  if (ancestors) {
    return inflectGeneration(ANCESTORS, ancestors[1].length, target);
  }
  if (/^D+$/.test(shape)) {
    return inflectGeneration(DESCENDANTS, shape.length, target);
  }
  const uncles = /^(U+)HS?$/.exec(shape);
  if (uncles) {
    return inflectGeneration(UNCLES, uncles[1].length, target);
  }
  if (shape === "UUUHD") {
    return `${inflect(DESCENDANTS[0], target)} ${inflect(OF_GREAT_UNCLE, sexAt(3))}`;
  }
  return null;
}

function focusName(focus: Person): string {
  return focus.id === DEFAULT_FOCUS_ID ? DEFAULT_FOCUS_SHORT_NAME : focus.displayName;
}

export function gradoLabel(
  graph: FamilyGraph,
  focusId: PersonId,
  personId: PersonId,
): string | null {
  const focus = requirePerson(graph, focusId);
  requirePerson(graph, personId);
  if (focusId === personId) {
    return "Persona foco";
  }
  const confirmed: FamilyGraph = {
    people: graph.people,
    edges: graph.edges.filter((edge) => edge.certainty === "confirmed"),
  };
  const sure = shortestPath(confirmed, focusId, personId);
  const path = sure ?? shortestPath(graph, focusId, personId);
  const term = path ? termFor(graph, path) : null;
  if (!term) {
    return null;
  }
  return `${term} de ${focusName(focus)}${sure ? "" : " (hipótesis)"}`;
}
