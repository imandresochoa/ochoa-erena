import { describe, expect, it } from "vitest";
import { parseFamily } from "@/domain/parse";

const FRANCISCO_LINK = {
  label: "Javier Ochoa Palop, Jaén 1961",
  href: "http://abretelibro.blogspot.com/2014/09/empecemos-por-el-comienzo.html",
};

const FRANCISCO_SOURCE = {
  label: "Javier Ochoa Palop, Jaén 1961",
  href: "http://abretelibro.blogspot.com/2014/09/empecemos-por-el-comienzo.html",
  kind: "web",
  mark: "H",
};

const ANTONIO_SOURCES = [
  {
    label: "Geneanet aerec5",
    href: "https://gw.geneanet.org/aerec5",
    kind: "geneanet",
    mark: "AEC",
  },
  {
    label: "Bitácora In ictu oculi",
    href: "http://antonioerena.blogspot.com/2019/01/",
    kind: "web",
    mark: "AEC",
  },
];

function parsePerson(raw: Record<string, unknown>) {
  const [person] = parseFamily({
    people: [
      {
        id: "andres-martin-ochoa-erena",
        displayName: "Andrés Martín Ochoa Erena",
        marks: ["TO"],
        ...raw,
      },
    ],
    edges: [],
  }).people;
  return person;
}

describe("parseFamily sources", () => {
  it("reads valid sources at the JSON boundary", () => {
    const person = parsePerson({
      id: "francisco-javier-ochoa-palop",
      displayName: "Francisco Javier Ochoa Palop",
      marks: ["TO", "H"],
      links: [FRANCISCO_LINK],
      sources: [FRANCISCO_SOURCE],
    });
    expect(person.sources).toEqual([FRANCISCO_SOURCE]);
  });

  it("keeps Antonio's geneanet and web citations", () => {
    const person = parsePerson({
      id: "antonio-erena-camacho",
      displayName: "Antonio Erena Camacho",
      marks: ["TO", "AEC"],
      sources: ANTONIO_SOURCES,
    });
    expect(person.sources).toEqual(ANTONIO_SOURCES);
  });

  it("drops a row missing href and does not copy a link href", () => {
    const person = parsePerson({
      id: "francisco-javier-ochoa-palop",
      displayName: "Francisco Javier Ochoa Palop",
      marks: ["TO", "H"],
      links: [FRANCISCO_LINK],
      sources: [
        {
          label: FRANCISCO_SOURCE.label,
          kind: "web",
          mark: "H",
        },
      ],
    });
    expect(person.sources).toEqual([]);
    expect(person.links).toEqual([FRANCISCO_LINK]);
  });

  it("drops an unknown kind and does not invent one from the URL host", () => {
    const person = parsePerson({
      id: "antonio-erena-camacho",
      displayName: "Antonio Erena Camacho",
      marks: ["TO", "AEC"],
      sources: [
        {
          label: "Geneanet aerec5",
          href: "https://gw.geneanet.org/aerec5",
          mark: "AEC",
        },
        {
          label: "Geneanet aerec5",
          href: "https://gw.geneanet.org/aerec5",
          kind: "wikipedia",
          mark: "AEC",
        },
      ],
    });
    expect(person.sources).toEqual([]);
  });

  it("treats a missing sources key as empty", () => {
    const person = parsePerson({
      displayName: "Andrés Martín Ochoa Erena",
    });
    expect(person.sources).toEqual([]);
  });

  it("treats a non-array sources value as empty", () => {
    const person = parsePerson({
      displayName: "Andrés Martín Ochoa Erena",
      sources: { label: "Geneanet aerec5" },
    });
    expect(person.sources).toEqual([]);
  });

  it("keeps the person when a source row is invalid", () => {
    const person = parsePerson({
      id: "francisco-javier-ochoa-palop",
      displayName: "Francisco Javier Ochoa Palop",
      marks: ["TO", "H"],
      sources: [
        FRANCISCO_SOURCE,
        { label: "", href: FRANCISCO_SOURCE.href, kind: "web", mark: "H" },
        { label: FRANCISCO_SOURCE.label, href: "", kind: "web", mark: "H" },
        {
          label: FRANCISCO_SOURCE.label,
          href: FRANCISCO_SOURCE.href,
          kind: "web",
          mark: "XX",
        },
      ],
    });
    expect(person.displayName).toBe("Francisco Javier Ochoa Palop");
    expect(person.id).toBe("francisco-javier-ochoa-palop");
    expect(person.sources).toEqual([FRANCISCO_SOURCE]);
  });
});
