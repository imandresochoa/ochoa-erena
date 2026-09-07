import { describe, expect, it } from "vitest";
import familyJson from "@/data/family.json";
import { family } from "@/data/family";
import { parentsOf } from "@/domain/graph";
import { NEBLINA_COPY } from "@/domain/neblina";
import { asPersonId } from "@/domain/types";

type RawLife = { year?: number };
type RawPerson = {
  id: string;
  displayName: string;
  birth?: RawLife;
};
type RawEdge = {
  kind?: string;
  from?: string;
  to?: string;
};
type RawVinculo = { label?: string; note?: string };
type RawLink = { label?: string; href?: string };
type RawSource = RawLink & { kind?: string; mark?: string };
type RawContext = {
  id?: string;
  kind?: string;
  displayName?: string;
  zone?: string;
  branch?: string;
  summary?: string;
  history?: string;
  anchors?: string[];
  vinculaciones?: RawVinculo[];
  links?: RawLink[];
  sources?: RawSource[];
};

function rawPeople(): RawPerson[] {
  return familyJson.people as RawPerson[];
}

function rawEdges(): RawEdge[] {
  return familyJson.edges as RawEdge[];
}

function rawContexts(): RawContext[] {
  return ((familyJson as { contexts?: RawContext[] }).contexts ?? []) as RawContext[];
}

function isSigloXvYear(year: number | undefined): boolean {
  return year !== undefined && year >= 1400 && year <= 1499;
}

describe("neblina does not invent siglo XV genealogy", () => {
  it("keeps the snapshot size so this UI change adds no people or edges", () => {
    expect(rawPeople()).toHaveLength(63);
    expect(family.people).toHaveLength(63);
    expect(rawEdges()).toHaveLength(100);
    expect(family.edges).toHaveLength(100);
  });

  it("has no s.XV birth years and no s.XV parent edges", () => {
    const xvPeople = rawPeople().filter((person) => isSigloXvYear(person.birth?.year));
    expect(xvPeople).toEqual([]);
    const xvIds = new Set(xvPeople.map((person) => person.id));
    expect(
      rawEdges().some(
        (edge) =>
          edge.kind === "parent" &&
          (xvIds.has(edge.from ?? "") || xvIds.has(edge.to ?? "")),
      ),
    ).toBe(false);
  });

  it("does not add Juan Sendo, a solar person, or a 1444 filiation", () => {
    for (const person of rawPeople()) {
      expect(person.id).not.toMatch(/sendo/i);
      expect(person.displayName).not.toMatch(/sendo/i);
      expect(person.id).not.toMatch(/^solar/i);
      expect(person.id).not.toMatch(/1444/);
      expect(person.displayName).not.toMatch(/1444/);
    }
    expect(
      family.edges.some(
        (edge) =>
          edge.kind === "parent" &&
          /1444|sendo|solar/i.test(`${edge.from} ${edge.to}`),
      ),
    ).toBe(false);
  });

  it("leaves Juan Ochoa de Eguiara without invented parents", () => {
    expect(parentsOf(family, asPersonId("juan-ochoa-de-eguiara"))).toEqual([]);
  });
});

describe("sel-de-egiara context payload", () => {
  it("is a fog lateral context, not a person and not a parent edge", () => {
    const raw = rawContexts().find((item) => item.id === "sel-de-egiara");
    expect(raw).toBeDefined();
    expect(raw?.kind).toBe("solar");
    expect(raw?.displayName).toBe("Sel de Egiara");
    expect(raw?.zone).toBe("fog");
    expect(raw?.branch).toBe("lateral");
    expect(raw?.anchors).toEqual([
      "juan-jose-ochoa-de-eguiara",
      "juan-ochoa-de-eguiara",
    ]);
    expect(rawPeople().some((person) => person.id === "sel-de-egiara")).toBe(false);
    expect(
      rawEdges().some(
        (edge) => edge.from === "sel-de-egiara" || edge.to === "sel-de-egiara",
      ),
    ).toBe(false);
    expect(family.contexts.map((item) => item.id)).toEqual(["sel-de-egiara"]);
  });

  it("carries the canónico lead, historia, vinculaciones, and link-only sources", () => {
    const raw = rawContexts().find((item) => item.id === "sel-de-egiara");
    const parsed = family.contexts.find((item) => item.id === "sel-de-egiara");
    expect(raw?.summary).toBe(NEBLINA_COPY);
    expect(parsed?.summary).toBe(NEBLINA_COPY);
    expect(raw?.history).toMatch(/Yrízar/);
    expect(raw?.history).toMatch(/1444/);
    expect(raw?.history).toMatch(/1447/);
    expect(raw?.history).toMatch(/1477/);
    expect(raw?.history).toMatch(/Bergara/);
    expect(raw?.history).toMatch(/no prueba/i);
    const notes = (raw?.vinculaciones ?? []).map((item) => item.note).join(" ");
    expect(notes).toMatch(/nombre compartido/i);
    expect(notes).toMatch(/1828/);
    expect(notes).toMatch(/no están definidas/i);
    expect(JSON.stringify(raw)).not.toMatch(/fuente oral/i);
    expect(raw?.sources?.every((source) => Boolean(source.href))).toBe(true);
    expect(raw?.sources?.some((source) => source.mark === "TO")).toBe(false);
    expect(raw?.links?.map((link) => link.href)).toEqual(
      expect.arrayContaining([
        "https://catalogo.sanchoelsabio.eus/Record/AtoM-677383",
        "https://artxiboa.sanchoelsabio.eus/fss-ud677383",
        "https://catalogo.sanchoelsabio.eus/Record/AtoM-673131",
      ]),
    );
    expect(raw?.links?.some((link) => /1477|N3654/i.test(link.label ?? ""))).toBe(
      true,
    );
  });
});
