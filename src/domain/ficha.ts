import type { Person, PersonLink, PersonSource } from "./types";

export const ANDRES_NOTICE_EMAIL = "Andresmoer@gmail.com";

export type Ficha = {
  displayName: string;
  lifeProse: string | null;
  summary: string | null;
  links: PersonLink[];
  sources: PersonSource[];
  files: readonly never[];
  noticeMailto: string | null;
};

type LifeClause =
  | { kind: "place"; text: string }
  | { kind: "birth"; text: string }
  | { kind: "death"; text: string };

function stripDot(text: string): string {
  return text.trim().replace(/\.+$/, "");
}

function asSentence(text: string): string {
  const trimmed = stripDot(text);
  const head = trimmed.charAt(0).toLocaleUpperCase("es-ES");
  return `${head}${trimmed.slice(1)}.`;
}

function needsEn(text: string): boolean {
  return /^[A-ZÁÉÍÓÚÑÜa-záéíóúñü]/.test(text);
}

function eventSentence(verb: "Nació" | "Murió", text: string, already: RegExp): string {
  const trimmed = stripDot(text);
  if (already.test(trimmed)) {
    return asSentence(trimmed);
  }
  if (needsEn(trimmed)) {
    return `${verb} en ${trimmed}.`;
  }
  return `${verb} ${trimmed}.`;
}

function lifeClauses(person: Person): LifeClause[] {
  const clauses: LifeClause[] = [];
  if (person.place) {
    clauses.push({ kind: "place", text: person.place });
  }
  if (person.birth?.text) {
    clauses.push({ kind: "birth", text: person.birth.text });
  }
  if (person.death?.text) {
    clauses.push({ kind: "death", text: person.death.text });
  }
  return clauses;
}

function renderClause(clause: LifeClause): string {
  if (clause.kind === "place") {
    return `De ${clause.text}.`;
  }
  if (clause.kind === "birth") {
    return eventSentence("Nació", clause.text, /^(naci[oó]|baut)/i);
  }
  return eventSentence("Murió", clause.text, /^(muri[oó]|muerte|defun)/i);
}

function lifeProse(person: Person): string | null {
  const clauses = lifeClauses(person);
  return clauses.length > 0 ? clauses.map(renderClause).join(" ") : null;
}

function noticeMailto(displayName: string): string {
  const subject = `Ficha pendiente: ${displayName}`;
  const body = `Hola Andrés,\n\nHace falta una ficha para ${displayName} en el árbol.\n`;
  return `mailto:${ANDRES_NOTICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function leftoverLinks(links: PersonLink[], sources: PersonSource[]): PersonLink[] {
  const hrefs = new Set(sources.map((source) => source.href));
  return links.filter((link) => !link.href || !hrefs.has(link.href));
}

export function fichaFromPerson(person: Person): Ficha {
  const summary = person.summary.trim() ? person.summary : null;
  const links = person.links;
  const sources = person.sources ?? [];
  const thin = summary === null && links.length === 0;
  return {
    displayName: person.displayName,
    lifeProse: lifeProse(person),
    summary,
    links,
    sources,
    files: [],
    noticeMailto: thin ? noticeMailto(person.displayName) : null,
  };
}
