import { foldAccents } from "./search";
import {
  asPersonId,
  type Edge,
  type FamilyGraph,
  type Person,
  type PersonSource,
  type SourceKind,
  type SourceMark,
} from "./types";

const MARKS = new Set<SourceMark>(["TO", "H", "AEC", "C", "N"]);
const KINDS = new Set(["parent", "spouse", "sibling"]);
const SOURCE_KINDS = new Set<SourceKind>([
  "ahdv",
  "pares",
  "boe",
  "geneanet",
  "ahus",
  "bvm",
  "web",
]);
const CERTAINTY = new Set(["confirmed", "hypothesis"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }
  return value;
}

function readMarks(value: unknown): SourceMark[] {
  if (!Array.isArray(value)) {
    throw new Error("marks must be an array");
  }
  return value.map((item) => {
    if (typeof item !== "string" || !MARKS.has(item as SourceMark)) {
      throw new Error(`Unknown mark ${String(item)}`);
    }
    return item as SourceMark;
  });
}

function readPerson(value: unknown): Person {
  if (!isRecord(value)) {
    throw new Error("Person must be an object");
  }
  const displayName = readString(value.displayName, "displayName");
  const person: Person = {
    id: asPersonId(readString(value.id, "id")),
    displayName,
    searchKey:
      typeof value.searchKey === "string" && value.searchKey.length > 0
        ? value.searchKey
        : foldAccents(displayName),
    marks: readMarks(value.marks),
    summary: typeof value.summary === "string" ? value.summary : "",
    links: [],
    sources: [],
  };
  if (isRecord(value.birth) && typeof value.birth.year === "number") {
    person.birth = {
      year: value.birth.year,
      approx: Boolean(value.birth.approx),
      text: typeof value.birth.text === "string" ? value.birth.text : undefined,
    };
  }
  if (isRecord(value.death) && typeof value.death.year === "number") {
    person.death = {
      year: value.death.year,
      approx: Boolean(value.death.approx),
      text: typeof value.death.text === "string" ? value.death.text : undefined,
    };
  }
  if (typeof value.place === "string" && value.place.length > 0) {
    person.place = value.place;
  }
  if (Array.isArray(value.links)) {
    person.links = value.links.flatMap((link) => {
      if (!isRecord(link) || typeof link.label !== "string") {
        return [];
      }
      return [
        {
          label: link.label,
          href: typeof link.href === "string" ? link.href : undefined,
        },
      ];
    });
  }
  if (Array.isArray(value.sources)) {
    person.sources = value.sources.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }
      if (typeof item.label !== "string" || item.label.length === 0) {
        return [];
      }
      if (typeof item.href !== "string" || item.href.length === 0) {
        return [];
      }
      if (typeof item.kind !== "string" || !SOURCE_KINDS.has(item.kind as SourceKind)) {
        return [];
      }
      if (typeof item.mark !== "string" || !MARKS.has(item.mark as SourceMark)) {
        return [];
      }
      const source: PersonSource = {
        label: item.label,
        href: item.href,
        kind: item.kind as SourceKind,
        mark: item.mark as SourceMark,
      };
      return [source];
    });
  }
  return person;
}

function readEdge(value: unknown): Edge {
  if (!isRecord(value)) {
    throw new Error("Edge must be an object");
  }
  const kind = readString(value.kind, "kind");
  const certainty = readString(value.certainty, "certainty");
  if (!KINDS.has(kind) || !CERTAINTY.has(certainty)) {
    throw new Error("Invalid edge kind or certainty");
  }
  return {
    kind: kind as Edge["kind"],
    from: asPersonId(readString(value.from, "from")),
    to: asPersonId(readString(value.to, "to")),
    certainty: certainty as Edge["certainty"],
  };
}

export function parseFamily(raw: unknown): FamilyGraph {
  if (!isRecord(raw) || !Array.isArray(raw.people) || !Array.isArray(raw.edges)) {
    throw new Error("Family data must have people and edges arrays");
  }
  const people = raw.people.map(readPerson);
  const ids = new Set(people.map((person) => person.id));
  if (ids.size !== people.length) {
    throw new Error("Duplicate person id");
  }
  const edges = raw.edges.map(readEdge);
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error(`Edge points at unknown person ${edge.from} -> ${edge.to}`);
    }
  }
  return { people, edges };
}
