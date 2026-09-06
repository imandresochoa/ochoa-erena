import { foldAccents } from "./search";
import type { EdgeKind, FamilyGraph, Person, PersonId } from "./types";
import { personById } from "./graph";

export type Sex = "m" | "f";

const GIVEN_SEX: Record<string, Sex> = {
  andrea: "f",
  andres: "m",
  angustias: "f",
  antonio: "m",
  aurora: "f",
  barbara: "f",
  bruno: "m",
  buenaventura: "m",
  candida: "f",
  capilla: "f",
  dolores: "f",
  emeterio: "m",
  encarnacion: "f",
  francisco: "m",
  francisca: "f",
  gregoria: "f",
  heliodoro: "m",
  joaquin: "m",
  jose: "m",
  josefa: "f",
  juan: "m",
  lino: "m",
  manuel: "m",
  maria: "f",
  martin: "m",
  martina: "f",
  matilde: "f",
  mercedes: "f",
  nicomedes: "m",
  patrocinio: "f",
  pedro: "m",
  phelipa: "f",
  rafael: "m",
  rosalia: "f",
  silvia: "f",
  vicenta: "f",
};

export function sexOfPerson(person: Person | undefined): Sex | undefined {
  if (!person) {
    return undefined;
  }
  const given = foldAccents(person.displayName).split(" ")[0];
  return GIVEN_SEX[given];
}

function parentWord(sex: Sex | undefined): string {
  if (sex === "f") {
    return "madre";
  }
  if (sex === "m") {
    return "padre";
  }
  return "padre/madre";
}

function childWord(sex: Sex | undefined): string {
  if (sex === "f") {
    return "hija";
  }
  if (sex === "m") {
    return "hijo";
  }
  return "hijo/a";
}

function siblingWord(a: Sex | undefined, b: Sex | undefined): string {
  if (a === "m" && b === "m") {
    return "hermanos";
  }
  if (a === "f" && b === "f") {
    return "hermanas";
  }
  return "hermano/a";
}

export function vinculoLabel(
  graph: FamilyGraph,
  kind: EdgeKind,
  fromId: PersonId,
  toId: PersonId,
): string {
  const from = personById(graph, fromId);
  const to = personById(graph, toId);
  if (kind === "spouse") {
    return "cónyuge";
  }
  if (kind === "sibling") {
    return siblingWord(sexOfPerson(from), sexOfPerson(to));
  }
  return `${parentWord(sexOfPerson(from))} · ${childWord(sexOfPerson(to))}`;
}
