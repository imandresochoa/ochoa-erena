import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import {
  ANDRES_NOTICE_EMAIL,
  fichaFromPerson,
  leftoverLinks,
} from "@/domain/ficha";
import { asPersonId, type Person } from "@/domain/types";

const FRANCISCO_HREF =
  "http://abretelibro.blogspot.com/2014/09/empecemos-por-el-comienzo.html";

const FRANCISCO_SOURCE = {
  label: "Javier Ochoa Palop, Jaén 1961",
  href: FRANCISCO_HREF,
  kind: "web" as const,
  mark: "H" as const,
};

const ANTONIO_LINKS = [
  { label: "Geneanet aerec5", href: "https://gw.geneanet.org/aerec5" },
  { label: "Bitácora In ictu oculi", href: "http://antonioerena.blogspot.com/2019/01/" },
];

const ANTONIO_SOURCES = [
  {
    label: "Geneanet aerec5",
    href: "https://gw.geneanet.org/aerec5",
    kind: "geneanet" as const,
    mark: "AEC" as const,
  },
  {
    label: "Bitácora In ictu oculi",
    href: "http://antonioerena.blogspot.com/2019/01/",
    kind: "web" as const,
    mark: "AEC" as const,
  },
];

function person(partial: Partial<Person> & Pick<Person, "displayName">): Person {
  return {
    id: asPersonId(partial.id ?? "thin"),
    displayName: partial.displayName,
    searchKey: partial.searchKey ?? partial.displayName.toLowerCase(),
    marks: partial.marks ?? [],
    birth: partial.birth,
    death: partial.death,
    place: partial.place,
    summary: partial.summary ?? "",
    links: partial.links ?? [],
    sources: partial.sources ?? [],
  };
}

describe("fichaFromPerson", () => {
  it("joins only place and dated marks that already exist", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Pedro Palop Fuentes",
        place: "Lucena",
        birth: { year: 1915, approx: false, text: "Lucena, 1915" },
        death: { year: 1989, approx: false, text: "Córdoba, 1989" },
      }),
    );
    expect(ficha.lifeLine).toBe("Lucena · Lucena, 1915 · Córdoba, 1989");
  });

  it("keeps Andrés on the snapshot place and refuses the Figma mock date", () => {
    const andres = family.people.find(
      (item) => item.id === "andres-martin-ochoa-erena",
    );
    expect(andres).toBeDefined();
    const ficha = fichaFromPerson(andres!);
    expect(ficha.displayName).toBe("Andrés Martín Ochoa Erena");
    expect(ficha.lifeLine).toBe("Jaén");
    expect(ficha.lifeLine).not.toContain("1995");
    expect(ficha.summary).toBe(andres!.summary);
    expect(ficha.links).toEqual([]);
    expect(ficha.sources).toEqual([]);
    expect(ficha.files).toEqual([]);
    expect(ficha.noticeMailto).toBeNull();
  });

  it("omits empty summary, links, and files", () => {
    const ficha = fichaFromPerson(person({ displayName: "Josefa Sáez de Eguilaz García de Vicuña" }));
    expect(ficha.summary).toBeNull();
    expect(ficha.links).toEqual([]);
    expect(ficha.sources).toEqual([]);
    expect(ficha.files).toEqual([]);
  });

  it("opens a notice mail when the ficha has only a name and optional place", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Heliodoro Palop Padrón",
        place: "Jaén",
      }),
    );
    expect(ficha.noticeMailto).toContain(`mailto:${ANDRES_NOTICE_EMAIL}`);
    const href = new URL(ficha.noticeMailto!);
    expect(href.protocol).toBe("mailto:");
    expect(decodeURIComponent(href.searchParams.get("subject") ?? "")).toContain(
      "Heliodoro Palop Padrón",
    );
    expect(decodeURIComponent(href.searchParams.get("body") ?? "")).toContain(
      "Heliodoro Palop Padrón",
    );
  });

  it("hides the notice when a summary or a real link exists", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          summary: "Padre de Andrés.",
        }),
      ).noticeMailto,
    ).toBeNull();
    expect(
      fichaFromPerson(
        person({
          displayName: "Antonio Erena Camacho",
          links: [{ label: "Geneanet aerec5", href: "https://gw.geneanet.org/aerec5" }],
        }),
      ).noticeMailto,
    ).toBeNull();
  });

  it("forwards snapshot links and never invents archivos", () => {
    const francisco = family.people.find(
      (item) => item.id === "francisco-javier-ochoa-palop",
    );
    expect(francisco).toBeDefined();
    const ficha = fichaFromPerson(francisco!);
    expect(ficha.links).toEqual(francisco!.links);
    expect(ficha.files).toEqual([]);
    expect(ficha.noticeMailto).toBeNull();
  });

  it("forwards person sources as-is and never invents a citation", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Antonio Erena Camacho",
        links: ANTONIO_LINKS,
        sources: ANTONIO_SOURCES,
      }),
    );
    expect(ficha.sources).toEqual(ANTONIO_SOURCES);
    expect(ficha.links).toEqual(ANTONIO_LINKS);
  });

  it("keeps empty sources empty", () => {
    expect(
      fichaFromPerson(person({ displayName: "Andrés Martín Ochoa Erena" })).sources,
    ).toEqual([]);
  });

  it("opens a notice from empty summary and empty links even when sources exist", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Heliodoro Palop Padrón",
        place: "Jaén",
        sources: [FRANCISCO_SOURCE],
      }),
    );
    expect(ficha.noticeMailto).toContain(`mailto:${ANDRES_NOTICE_EMAIL}`);
    expect(ficha.links).toEqual([]);
    expect(ficha.sources).toEqual([FRANCISCO_SOURCE]);
  });

  it("forwards Francisco's snapshot web source and keeps his full links", () => {
    const francisco = family.people.find(
      (item) => item.id === "francisco-javier-ochoa-palop",
    );
    expect(francisco).toBeDefined();
    const ficha = fichaFromPerson(francisco!);
    expect(ficha.sources).toEqual([FRANCISCO_SOURCE]);
    expect(ficha.links).toEqual(francisco!.links);
    expect(ficha.links[0]?.href).toBe(FRANCISCO_HREF);
  });
});

describe("leftoverLinks", () => {
  it("returns nothing when every link href is already a citation", () => {
    expect(leftoverLinks(ANTONIO_LINKS, ANTONIO_SOURCES)).toEqual([]);
    expect(
      leftoverLinks(
        [{ label: FRANCISCO_SOURCE.label, href: FRANCISCO_HREF }],
        [FRANCISCO_SOURCE],
      ),
    ).toEqual([]);
  });

  it("keeps links whose href is missing or not in sources", () => {
    const unlabeled = { label: "Geneanet aerec5" };
    const extra = ANTONIO_LINKS[0];
    const cited = { label: FRANCISCO_SOURCE.label, href: FRANCISCO_HREF };
    expect(leftoverLinks([cited, unlabeled, extra], [FRANCISCO_SOURCE])).toEqual([
      unlabeled,
      extra,
    ]);
  });

  it("returns every link when sources are empty", () => {
    expect(leftoverLinks(ANTONIO_LINKS, [])).toEqual(ANTONIO_LINKS);
  });
});
