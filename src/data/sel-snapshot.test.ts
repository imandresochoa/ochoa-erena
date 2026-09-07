import { describe, expect, it } from "vitest";
import familyJson from "@/data/family.json";
import { family } from "@/data/family";
import { parentsOf } from "@/domain/graph";
import { SEL_ID, SEL_SUMMARY } from "@/domain/sel";
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
type RawContext = {
  id?: string;
  kind?: string;
  displayName?: string;
  zone?: string;
  branch?: string;
  summary?: string;
  history?: string;
  anchors?: string[];
  vinculaciones?: { label?: string; note?: string }[];
  links?: { label?: string; href?: string }[];
  sources?: { label?: string; href?: string; kind?: string; mark?: string }[];
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

describe("sel node does not invent siglo XV genealogy", () => {
  it("keeps the snapshot size so this UI change adds no people or edges", () => {
    expect(rawPeople()).toHaveLength(73);
    expect(family.people).toHaveLength(73);
    expect(rawEdges()).toHaveLength(118);
    expect(family.edges).toHaveLength(118);
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

  it("does not attach the sel to Juan or Martín María as a parent", () => {
    expect(parentsOf(family, asPersonId("juan-ochoa-de-eguiara"))).not.toContain(
      SEL_ID,
    );
    expect(
      parentsOf(family, asPersonId("martin-maria-ochoa-de-eguiyara-antia")),
    ).not.toContain(SEL_ID);
  });
});

describe("sel-de-egiara context payload", () => {
  it("is the single lateral solar context, not a person and not a parent edge", () => {
    const raw = rawContexts().find((item) => item.id === SEL_ID);
    expect(raw).toBeDefined();
    expect(raw?.kind).toBe("solar");
    expect(raw?.displayName).toBe("Sel de Egiara");
    expect(raw?.zone).toBe("fog");
    expect(raw?.branch).toBe("lateral");
    expect(raw?.anchors).toEqual(["martin-maria-ochoa-de-eguiyara-antia"]);
    expect(rawPeople().some((person) => person.id === SEL_ID)).toBe(false);
    expect(
      rawEdges().some((edge) => edge.from === SEL_ID || edge.to === SEL_ID),
    ).toBe(false);
    expect(family.contexts.map((item) => item.id)).toEqual([SEL_ID]);
    for (const id of [
      "manuel-antonio-ochoa-de-eguiara",
      "juan-jose-de-eguiara-y-eguren",
    ]) {
      expect(rawContexts().some((item) => item.id === id)).toBe(false);
      expect(rawPeople().some((person) => person.id === id)).toBe(false);
    }
  });

  it("carries the canónico lead, historia, vinculaciones, and link-only sources", () => {
    const raw = rawContexts().find((item) => item.id === SEL_ID);
    const parsed = family.contexts.find((item) => item.id === SEL_ID);
    expect(raw?.summary).toBe(SEL_SUMMARY);
    expect(parsed?.summary).toBe(SEL_SUMMARY);
    expect(raw?.history).toBe(
      [
        "El sel de Eguiara (Egiara) aparece en el fondo Yrízar (Archivo de la Fundación Sancho el Sabio). El 31 de diciembre de 1444, García Ibáñez de Jáuregui vende el sel de Eguiara Goitia a Juan de Eguiara (también Juan Sendo de Eguiara); escribano Juan Pérez de Aróstegui. En septiembre de 1447 una sentencia confirma la posesión del sel a favor de Juan Sendoa de Eguiara. En 1477 hay informaciones de testigos sobre el mismo sel.",
        "En Bergara se documenta el solar / caserío Egiara Gañekoa (Egiara Suso), historia de toponimia y casería ligada al mismo nombre. Eso es contexto del solar: no prueba, por sí sola, una cadena padre–hijo hasta los Ochoa de Eguiara de Aspárrena (Egino / Albéniz) documentados en los siglos XVIII–XIX.",
        "Una fuente secundaria (Bergarako baserriak – Egiara Gañekoa) menciona que una rama de este solar pasó a Álava con el apellido Ochoa de Eguiara (Ozaeta / Barrundia), y cita a Manuel Antonio Ochoa de Eguiara (baut. Zalduendo 1740, hidalguía 1793). El bisabuelo Martín María Ochoa de Eguiyara Antia vino de Álava (Aspárrena–Vitoria). Eso da coherencia geográfica con esa mención de una rama a Álava como Ochoa de Eguiara. Sigue siendo posibilidad / mención: no es filiación confirmada al sel de Bergara del siglo XV ni a Manuel Antonio.",
      ].join("\n\n"),
    );
    expect((raw?.vinculaciones ?? []).map((item) => item.note)).toEqual([
      "Nombre compartido Ochoa / Eguiara–Egiara entre el sel (s. XV) y el tronco de Aspárrena.",
      "Tronco documentado con partidas hacia Juan José Ochoa de Eguiara (baut. 1828, Egino) y generaciones anteriores indexadas en AHDV (con tramos hipotéticos).",
      "Las aristas concretas que unan el sel del s. XV con ese tronco no están definidas.",
      "Bergarako baserriak (Egiara Gañekoa) menciona una rama a Álava bajo Ochoa de Eguiara (Ozaeta / Barrundia) y cita a Manuel Antonio Ochoa de Eguiara (baut. Zalduendo 1740, hidalguía 1793). El bisabuelo Martín María vino de Álava (Aspárrena–Vitoria): coherencia geográfica con esa nota, no filiación al Bergara del siglo XV ni a Manuel Antonio.",
    ]);
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
