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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("fichaFromPerson", () => {
  it("writes place and dated marks as ES Spain sentences, not a joined dump", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Pedro Palop Fuentes",
        place: "Lucena",
        birth: { year: 1915, approx: false, text: "Lucena, 1915" },
        death: { year: 1989, approx: false, text: "Córdoba, 1989" },
      }),
    );
    expect(ficha.lifeProse).toBe("De Lucena. Nació en Lucena, 1915. Murió en Córdoba, 1989.");
    expect(ficha.lifeProse).not.toContain(" · ");
  });

  it("keeps Andrés on the snapshot place and refuses the Figma mock date", () => {
    const andres = family.people.find(
      (item) => item.id === "andres-martin-ochoa-erena",
    );
    expect(andres).toBeDefined();
    const ficha = fichaFromPerson(andres!);
    expect(ficha.displayName).toBe("Andrés Martín Ochoa Erena");
    expect(ficha.lifeProse).toBe("De Jaén.");
    expect(ficha.lifeProse).not.toContain("1995");
    expect(ficha.summary).toBe(andres!.summary);
    expect(ficha.links).toEqual([]);
    expect(ficha.sources).toEqual([]);
    expect(ficha.files).toEqual([]);
    expect(ficha.noticeMailto).toBeNull();
  });

  it("omits empty summary, links, files, and life prose", () => {
    const ficha = fichaFromPerson(person({ displayName: "Josefa Sáez de Eguilaz García de Vicuña" }));
    expect(ficha.summary).toBeNull();
    expect(ficha.lifeProse).toBeNull();
    expect(ficha.links).toEqual([]);
    expect(ficha.sources).toEqual([]);
    expect(ficha.files).toEqual([]);
  });

  it("wraps approximate and year-only marks without rewriting the stored text", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          place: "Jaén",
          birth: { year: 1961, approx: true, text: "~1961, Jaén" },
        }),
      ).lifeProse,
    ).toBe("De Jaén. Nació ~1961, Jaén.");
    expect(
      fichaFromPerson(
        person({
          displayName: "Rafael Ochoa Hidalgo",
          death: { year: 2015, approx: false, text: "2015" },
        }),
      ).lifeProse,
    ).toBe("Murió 2015.");
  });

  it("keeps baptism and muerte notes as stored, without inventing nació or murió", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Martín María Ochoa de Eguiyara Antia",
          place: "Vitoria-Gasteiz",
          birth: { year: 1874, approx: false, text: "baut. 1874-10-12, San Pedro, Vitoria" },
          death: { year: 1926, approx: true, text: "muerte ~1926 [TO]" },
        }),
      ).lifeProse,
    ).toBe("De Vitoria-Gasteiz. Baut. 1874-10-12, San Pedro, Vitoria. Muerte ~1926 [TO].");
  });

  it("builds every snapshot life prose from place and date texts only, in that order", () => {
    for (const item of family.people) {
      const prose = fichaFromPerson(item).lifeProse;
      const fragments = [item.place, item.birth?.text, item.death?.text].filter(
        (part): part is string => Boolean(part),
      );
      if (fragments.length === 0) {
        expect(prose).toBeNull();
        continue;
      }
      expect(prose).toBeTruthy();
      const folded = prose!.toLocaleLowerCase("es-ES");
      let rest = prose!;
      const hits: number[] = [];
      for (const fragment of fragments) {
        const needle = fragment.replace(/\.+$/, "");
        const at = folded.indexOf(needle.toLocaleLowerCase("es-ES"));
        expect(at).toBeGreaterThan(-1);
        hits.push(at);
        rest = rest.replace(new RegExp(escapeRegExp(needle), "i"), "");
      }
      for (let index = 1; index < hits.length; index += 1) {
        expect(hits[index]).toBeGreaterThan(hits[index - 1]);
      }
      expect(rest.replace(/\s+/g, " ").trim()).toMatch(
        /^(?:De\.?|Nació en\.?|Nació\.?|Murió en\.?|Murió\.?|[. ]+)*$/,
      );
    }
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
