import { foldAccents } from "./search";
import {
  asPersonId,
  type ContextBranch,
  type ContextKind,
  type ContextVinculo,
  type ContextZone,
  type Edge,
  type FamilyContext,
  type FamilyGraph,
  type FileVisibility,
  type Person,
  type PersonFile,
  type PersonLink,
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
const FILE_VISIBILITIES = new Set<FileVisibility>(["public", "private"]);
const CERTAINTY = new Set(["confirmed", "hypothesis"]);
const CONTEXT_KINDS = new Set<ContextKind>(["solar"]);
const CONTEXT_ZONES = new Set<ContextZone>(["fog"]);
const CONTEXT_BRANCHES = new Set<ContextBranch>(["lateral"]);

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

function readLinks(value: unknown): PersonLink[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((link) => {
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

function readSources(value: unknown): PersonSource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
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

function readFiles(value: unknown): PersonFile[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    if (typeof item.label !== "string" || item.label.length === 0) {
      return [];
    }
    if (typeof item.href !== "string" || item.href.length === 0) {
      return [];
    }
    if (
      typeof item.visibility !== "string" ||
      !FILE_VISIBILITIES.has(item.visibility as FileVisibility)
    ) {
      return [];
    }
    if (typeof item.locked !== "boolean") {
      return [];
    }
    const file: PersonFile = {
      label: item.label,
      href: item.href,
      visibility: item.visibility as FileVisibility,
      locked: item.locked,
    };
    return [file];
  });
}

function readVinculos(value: unknown): ContextVinculo[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    if (typeof item.label !== "string" || item.label.trim() === "") {
      return [];
    }
    if (typeof item.note !== "string" || item.note.trim() === "") {
      return [];
    }
    return [{ label: item.label, note: item.note }];
  });
}

function readContext(value: unknown): FamilyContext {
  if (!isRecord(value)) {
    throw new Error("Context must be an object");
  }
  const kind = readString(value.kind, "kind");
  const zone = readString(value.zone, "zone");
  const branch = readString(value.branch, "branch");
  if (
    !CONTEXT_KINDS.has(kind as ContextKind) ||
    !CONTEXT_ZONES.has(zone as ContextZone) ||
    !CONTEXT_BRANCHES.has(branch as ContextBranch)
  ) {
    throw new Error("Invalid context kind, zone, or branch");
  }
  const context: FamilyContext = {
    id: readString(value.id, "id"),
    kind: kind as ContextKind,
    displayName: readString(value.displayName, "displayName"),
    zone: zone as ContextZone,
    branch: branch as ContextBranch,
    todo: readString(value.todo, "todo"),
    summary: typeof value.summary === "string" ? value.summary : "",
    history: readString(value.history, "history"),
    vinculaciones: readVinculos(value.vinculaciones),
    links: readLinks(value.links),
    sources: readSources(value.sources),
  };
  if (typeof value.place === "string" && value.place.length > 0) {
    context.place = value.place;
  }
  if (Array.isArray(value.anchors)) {
    context.anchors = value.anchors.map((item) =>
      asPersonId(readString(item, "anchor")),
    );
  }
  return context;
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
    links: readLinks(value.links),
    sources: readSources(value.sources),
    files: readFiles(value.files),
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
  const contexts = Array.isArray(raw.contexts)
    ? raw.contexts.map(readContext)
    : [];
  for (const context of contexts) {
    if (ids.has(asPersonId(context.id))) {
      throw new Error(`Context id collides with a person ${context.id}`);
    }
    for (const anchor of context.anchors ?? []) {
      if (!ids.has(anchor)) {
        throw new Error(`Context ${context.id} anchors unknown person ${anchor}`);
      }
    }
  }
  return { people, edges, contexts };
}
