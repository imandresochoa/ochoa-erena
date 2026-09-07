import { describe, expect, it } from "vitest";
import familyJson from "@/data/family.json";
import { family } from "@/data/family";
import { parentsOf } from "@/domain/graph";
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

function rawPeople(): RawPerson[] {
  return familyJson.people as RawPerson[];
}

function rawEdges(): RawEdge[] {
  return familyJson.edges as RawEdge[];
}

function isSigloXvYear(year: number | undefined): boolean {
  return year !== undefined && year >= 1400 && year <= 1499;
}

describe("neblina does not invent siglo XV genealogy", () => {
  it("keeps the snapshot size so this UI change adds no data rows", () => {
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
