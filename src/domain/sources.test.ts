import { describe, expect, it } from "vitest";
import familyJson from "@/data/family.json";
import { family } from "@/data/family";

type RawSource = {
  label?: string;
  href?: string;
  kind?: string;
  mark?: string;
};

type RawPerson = {
  id: string;
  links?: Array<{ label?: string; href?: string }>;
  sources?: RawSource[];
};

function rawPeople(): RawPerson[] {
  return familyJson.people as RawPerson[];
}

function domainPerson(id: string) {
  const person = family.people.find((item) => item.id === id);
  if (!person) {
    throw new Error(`Missing person ${id}`);
  }
  return person;
}

describe("family sources", () => {
  it("keeps 63 people and fills sources after parse", () => {
    expect(family.people).toHaveLength(63);
    const raw = rawPeople();
    expect(raw).toHaveLength(63);
    for (const person of family.people) {
      const json = raw.find((item) => item.id === person.id);
      if (!Array.isArray(json?.sources)) {
        expect(person.sources).toEqual([]);
      } else {
        expect(person.sources).toEqual(json.sources);
      }
    }
  });

  it("keeps Francisco's one web source on the same href as his link", () => {
    const person = domainPerson("francisco-javier-ochoa-palop");
    expect(person.sources).toEqual([
      {
        label: "Javier Ochoa Palop, Jaén 1961",
        href: "http://abretelibro.blogspot.com/2014/09/empecemos-por-el-comienzo.html",
        kind: "web",
        mark: "H",
      },
    ]);
    expect(person.links).toEqual([
      {
        label: "Javier Ochoa Palop, Jaén 1961",
        href: "http://abretelibro.blogspot.com/2014/09/empecemos-por-el-comienzo.html",
      },
    ]);
  });

  it("keeps Antonio Erena Camacho's geneanet and web sources", () => {
    expect(domainPerson("antonio-erena-camacho").sources).toEqual([
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
    ]);
  });

  it("leaves Andrés without sources", () => {
    expect(domainPerson("andres-martin-ochoa-erena").sources).toEqual([]);
  });

  it("leaves Heliodoro and people with no open URL without sources", () => {
    for (const id of [
      "heliodoro-palop-padron",
      "matilde-fuentes-lopez",
      "silvia-erena-camacho",
      "maria-aurora-erena-camacho",
    ]) {
      expect(domainPerson(id).sources).toEqual([]);
    }
  });

  it("only cites hrefs that already exist on that person's links", () => {
    for (const person of family.people) {
      expect(Array.isArray(person.sources)).toBe(true);
      const linkHrefs = new Set(
        person.links
          .map((link) => link.href)
          .filter((href): href is string => Boolean(href)),
      );
      for (const source of person.sources) {
        expect(linkHrefs.has(source.href)).toBe(true);
      }
    }
  });
});
