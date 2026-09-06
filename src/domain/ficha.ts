import type { Person, PersonLink } from "./types";

export const ANDRES_NOTICE_EMAIL = "Andresmoer@gmail.com";

export type Ficha = {
  displayName: string;
  lifeLine: string | null;
  summary: string | null;
  links: PersonLink[];
  files: readonly never[];
  noticeMailto: string | null;
};

function lifeLine(person: Person): string | null {
  const parts = [person.place, person.birth?.text, person.death?.text].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

function noticeMailto(displayName: string): string {
  const subject = `Ficha pendiente: ${displayName}`;
  const body = `Hola Andrés,\n\nHace falta una ficha para ${displayName} en el árbol.\n`;
  return `mailto:${ANDRES_NOTICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function fichaFromPerson(person: Person): Ficha {
  const summary = person.summary.trim() ? person.summary : null;
  const links = person.links;
  const thin = summary === null && links.length === 0;
  return {
    displayName: person.displayName,
    lifeLine: lifeLine(person),
    summary,
    links,
    files: [],
    noticeMailto: thin ? noticeMailto(person.displayName) : null,
  };
}
