import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import {
  ANDRES_NOTICE_EMAIL,
  fichaDoubt,
  fichaFromPerson,
  leftoverLinks,
} from "@/domain/ficha";
import { asPersonId, type LifeMark, type Person } from "@/domain/types";

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

function person(
  partial: Partial<Person> &
    Pick<Person, "displayName"> & {
      files?: Array<{
        label: string;
        href: string;
        visibility: "public" | "private";
        locked: boolean;
      }>;
    },
): Person {
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
    files: partial.files ?? [],
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ISO_IN_PROSE = /\d{4}-\d{2}(?:-\d{2})?/;

function dateClauses(item: Person, prose: string | null): string[] {
  if (!prose) {
    return [];
  }
  let rest = prose;
  if (item.place) {
    const prefix = `De ${item.place}.`;
    if (rest.startsWith(prefix)) {
      rest = rest.slice(prefix.length).trim();
    }
  }
  return rest.length > 0 ? rest.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑÜ])/) : [];
}

function markReadsApprox(mark: LifeMark | undefined): boolean {
  return Boolean(mark && (mark.approx || mark.text?.includes("~")));
}

describe("fichaFromPerson", () => {
  it("writes place and house-formatted dates as ES Spain sentences, not a joined dump", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Pedro Palop Fuentes",
        place: "Lucena",
        birth: { year: 1915, approx: false, text: "Lucena, 1915" },
        death: { year: 1989, approx: false, text: "Córdoba, 1989" },
      }),
    );
    expect(ficha.lifeProse).toBe("De Lucena. Nació 1915. Murió 1989.");
    expect(ficha.lifeProse).not.toContain(" · ");
    expect(ficha.lifeProse).not.toContain("Resumen");
  });

  it("formats Francisco Javier as place plus approx year without repeating Jaén", () => {
    const francisco = family.people.find(
      (item) => item.id === "francisco-javier-ochoa-palop",
    );
    expect(francisco).toBeDefined();
    expect(fichaFromPerson(francisco!).lifeProse).toBe("De Jaén. Nació ~1961.");
  });

  it("formats Martín María baptism and death without ISO, muerte, or source tags", () => {
    const martin = family.people.find(
      (item) => item.id === "martin-maria-ochoa-de-eguiyara-antia",
    );
    expect(martin).toBeDefined();
    expect(fichaFromPerson(martin!).lifeProse).toBe(
      "De Vitoria-Gasteiz. Baut. 12 de octubre de 1874. Murió ~1926.",
    );
  });

  it("formats Gregoria baptism day without a person place", () => {
    const gregoria = family.people.find((item) => item.id === "gregoria-ochoa-antia");
    expect(gregoria).toBeDefined();
    expect(gregoria!.place).toBeUndefined();
    expect(fichaFromPerson(gregoria!).lifeProse).toBe("Baut. 25 de abril de 1863.");
  });

  it("keeps Andrés on the snapshot place and the confirmed birth day", () => {
    const andres = family.people.find(
      (item) => item.id === "andres-martin-ochoa-erena",
    );
    expect(andres).toBeDefined();
    const ficha = fichaFromPerson(andres!);
    expect(ficha.displayName).toBe("Andrés Martín Ochoa Erena");
    expect(ficha.lifeProse).toBe("De Jaén. Nació 12 de noviembre de 1995.");
    expect(andres!.birth).toEqual({
      year: 1995,
      approx: false,
      text: "1995-11-12",
    });
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

  it("wraps house-formatted approx and year-only marks and drops places inside date text", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          place: "Jaén",
          birth: { year: 1961, approx: true, text: "~1961, Jaén" },
        }),
      ).lifeProse,
    ).toBe("De Jaén. Nació ~1961.");
    expect(
      fichaFromPerson(
        person({
          displayName: "Rafael Ochoa Hidalgo",
          death: { year: 2015, approx: false, text: "2015" },
        }),
      ).lifeProse,
    ).toBe("Murió 2015.");
  });

  it("keeps baut. in prose and formats the house date, without inventing nació", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Martín María Ochoa de Eguiyara Antia",
          place: "Vitoria-Gasteiz",
          birth: { year: 1874, approx: false, text: "baut. 1874-10-12, San Pedro, Vitoria" },
          death: { year: 1926, approx: true, text: "muerte ~1926 [TO]" },
        }),
      ).lifeProse,
    ).toBe("De Vitoria-Gasteiz. Baut. 12 de octubre de 1874. Murió ~1926.");
  });

  it("builds every snapshot life prose from place and house-formatted dates, in that order", () => {
    for (const item of family.people) {
      const prose = fichaFromPerson(item).lifeProse;
      if (!item.place && !item.birth && !item.death) {
        expect(prose).toBeNull();
        continue;
      }
      expect(prose, item.displayName).toBeTruthy();
      expect(prose, item.displayName).not.toContain(" · ");
      expect(prose ?? "", item.displayName).not.toMatch(ISO_IN_PROSE);

      if (item.place) {
        expect(prose, item.displayName).toMatch(
          new RegExp(`^De ${escapeRegExp(item.place)}\\.`),
        );
      }

      const clauses = dateClauses(item, prose);
      let rest = prose!;
      if (item.place) {
        rest = rest.replace(new RegExp(`^De ${escapeRegExp(item.place)}\\.`), "");
      }

      if (item.birth) {
        const birthClause = clauses[0];
        expect(birthClause, `${item.displayName} birth`).toBeDefined();
        expect(birthClause, `${item.displayName} birth`).toContain(String(item.birth.year));
        if (item.birth.text && /baut/i.test(item.birth.text)) {
          expect(birthClause, `${item.displayName} birth`).toMatch(/^Baut\./);
          expect(birthClause, `${item.displayName} birth`).not.toMatch(/^Nació/);
        } else {
          expect(birthClause, `${item.displayName} birth`).toMatch(/^Nació/);
        }
        rest = rest.replace(birthClause!, "");
      }

      if (item.death) {
        const deathClause = clauses[item.birth ? 1 : 0];
        expect(deathClause, `${item.displayName} death`).toBeDefined();
        expect(deathClause, `${item.displayName} death`).toContain(String(item.death.year));
        expect(deathClause, `${item.displayName} death`).toMatch(/^Murió/);
        rest = rest.replace(deathClause!, "");
      }

      expect(rest.replace(/\s+/g, " ").trim(), item.displayName).toBe("");
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

  it("keeps empty files empty", () => {
    expect(
      fichaFromPerson(person({ displayName: "Andrés Martín Ochoa Erena", files: [] })).files,
    ).toEqual([]);
  });

  it("projects only public unlocked files as label and href", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Francisco Javier Ochoa Palop",
        files: [
          {
            label: "Acta",
            href: "https://files.test/acta.pdf",
            visibility: "public",
            locked: false,
          },
        ],
      }),
    );
    expect(ficha.files).toEqual([{ label: "Acta", href: "https://files.test/acta.pdf" }]);
  });

  it("hides a locked public file", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          files: [
            {
              label: "Carta",
              href: "https://files.test/carta.pdf",
              visibility: "public",
              locked: true,
            },
          ],
        }),
      ).files,
    ).toEqual([]);
  });

  it("hides a private unlocked file", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          files: [
            {
              label: "Nota",
              href: "https://files.test/nota.pdf",
              visibility: "private",
              locked: false,
            },
          ],
        }),
      ).files,
    ).toEqual([]);
  });

  it("hides a private locked file", () => {
    expect(
      fichaFromPerson(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          files: [
            {
              label: "Diario",
              href: "https://files.test/diario.pdf",
              visibility: "private",
              locked: true,
            },
          ],
        }),
      ).files,
    ).toEqual([]);
  });

  it("keeps only public unlocked files in source order", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Francisco Javier Ochoa Palop",
        files: [
          {
            label: "Carta",
            href: "https://files.test/carta.pdf",
            visibility: "public",
            locked: true,
          },
          {
            label: "Acta",
            href: "https://files.test/acta.pdf",
            visibility: "public",
            locked: false,
          },
          {
            label: "Nota",
            href: "https://files.test/nota.pdf",
            visibility: "private",
            locked: false,
          },
          {
            label: "Padron",
            href: "https://files.test/padron.pdf",
            visibility: "public",
            locked: false,
          },
          {
            label: "Diario",
            href: "https://files.test/diario.pdf",
            visibility: "private",
            locked: true,
          },
        ],
      }),
    );
    expect(ficha.files).toEqual([
      { label: "Acta", href: "https://files.test/acta.pdf" },
      { label: "Padron", href: "https://files.test/padron.pdf" },
    ]);
  });

  it("never invents files on snapshot fichas", () => {
    for (const item of family.people) {
      expect(fichaFromPerson(item).files, item.displayName).toEqual([]);
    }
  });

  it("does not invent files from links or sources", () => {
    const ficha = fichaFromPerson(
      person({
        displayName: "Antonio Erena Camacho",
        links: ANTONIO_LINKS,
        sources: ANTONIO_SOURCES,
      }),
    );
    expect(ficha.files).toEqual([]);
    expect(ficha.links).toEqual(ANTONIO_LINKS);
    expect(ficha.sources).toEqual(ANTONIO_SOURCES);
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

  it("forwards Dudoso when marks include C or N", () => {
    expect(
      fichaFromPerson(person({ displayName: "José Ochoa Hidalgo", marks: ["C"] })).doubt,
    ).toEqual({ label: "Dudoso" });
    expect(
      fichaFromPerson(person({ displayName: "Bruno Guillerna Ochoa", marks: ["N"] })).doubt,
    ).toEqual({ label: "Dudoso" });
  });

  it("forwards null doubt when marks have no C or N", () => {
    expect(
      fichaFromPerson(person({ displayName: "Andrés Martín Ochoa Erena", marks: ["TO"] }))
        .doubt,
    ).toBeNull();
    expect(
      fichaFromPerson(
        person({ displayName: "Joaquín Antia Martínez de Albéniz", marks: ["H"] }),
      ).doubt,
    ).toBeNull();
  });

  it("forwards snapshot doubt from the same C or N predicate", () => {
    for (const item of family.people) {
      expect(fichaFromPerson(item).doubt).toEqual(fichaDoubt(item));
    }
  });
});

describe("fichaDoubt", () => {
  it("returns Dudoso when marks include C", () => {
    expect(fichaDoubt(person({ displayName: "José Ochoa Hidalgo", marks: ["C"] }))).toEqual({
      label: "Dudoso",
    });
  });

  it("returns Dudoso when marks include N", () => {
    expect(
      fichaDoubt(person({ displayName: "Bruno Guillerna Ochoa", marks: ["N"] })),
    ).toEqual({ label: "Dudoso" });
  });

  it("returns Dudoso when C or N is mixed with other marks", () => {
    expect(
      fichaDoubt(person({ displayName: "José Ochoa Hidalgo", marks: ["TO", "C", "H"] })),
    ).toEqual({ label: "Dudoso" });
    expect(
      fichaDoubt(person({ displayName: "Bruno Guillerna Ochoa", marks: ["H", "TO", "N"] })),
    ).toEqual({ label: "Dudoso" });
  });

  it("returns null for H alone", () => {
    expect(
      fichaDoubt(person({ displayName: "Joaquín Antia Martínez de Albéniz", marks: ["H"] })),
    ).toBeNull();
  });

  it("returns null for TO alone", () => {
    expect(
      fichaDoubt(person({ displayName: "Andrés Martín Ochoa Erena", marks: ["TO"] })),
    ).toBeNull();
  });

  it("returns null for TO and AEC", () => {
    expect(
      fichaDoubt(person({ displayName: "Antonio Erena Camacho", marks: ["TO", "AEC"] })),
    ).toBeNull();
  });

  it("does not infer Dudoso from a source marked H", () => {
    expect(
      fichaDoubt(
        person({
          displayName: "Francisco Javier Ochoa Palop",
          marks: ["TO"],
          sources: [FRANCISCO_SOURCE],
        }),
      ),
    ).toBeNull();
  });

  it("flags every snapshot person with C or N and nobody else", () => {
    for (const item of family.people) {
      const dudoso = item.marks.includes("C") || item.marks.includes("N");
      if (dudoso) {
        expect(fichaDoubt(item)).toEqual({ label: "Dudoso" });
      } else {
        expect(fichaDoubt(item)).toBeNull();
      }
    }
  });

  it("flags José, Juan, Josefa, and Bruno as Dudoso", () => {
    for (const id of [
      "jose-ochoa-hidalgo",
      "juan-ochoa-de-eguiara",
      "josefa-saez-de-eguilaz",
      "bruno-guillerna-ochoa",
    ]) {
      const item = family.people.find((entry) => entry.id === id);
      expect(item).toBeDefined();
      expect(fichaDoubt(item!)).toEqual({ label: "Dudoso" });
    }
  });

  it("does not flag Andrés, Francisco, Joaquín, Andrés Erena, or Capilla", () => {
    for (const id of [
      "andres-martin-ochoa-erena",
      "francisco-javier-ochoa-palop",
      "joaquin-antia",
      "andres-erena",
      "capilla-liebana",
    ]) {
      const item = family.people.find((entry) => entry.id === id);
      expect(item).toBeDefined();
      expect(fichaDoubt(item!)).toBeNull();
    }
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

describe("house date display on every ficha lifeProse", () => {
  it("drops ISO yyyy-mm-dd and yyyy-mm from every lifeProse", () => {
    for (const item of family.people) {
      const lifeProse = fichaFromPerson(item).lifeProse;
      expect(lifeProse ?? "", item.displayName).not.toMatch(ISO_IN_PROSE);
    }
  });

  it("drops comma-place tails from date clauses", () => {
    for (const item of family.people) {
      for (const clause of dateClauses(item, fichaFromPerson(item).lifeProse)) {
        expect(clause, `${item.displayName}: ${clause}`).not.toMatch(/, /);
      }
    }
  });

  it("keeps a tilde on each approximate birth or death", () => {
    for (const item of family.people) {
      const lifeProse = fichaFromPerson(item).lifeProse;
      const clauses = dateClauses(item, lifeProse);
      if (markReadsApprox(item.birth)) {
        expect(clauses[0], `${item.displayName} birth`).toContain("~");
      }
      if (markReadsApprox(item.death)) {
        expect(clauses[item.birth ? 1 : 0], `${item.displayName} death`).toContain("~");
      }
    }
  });

  it("does not invent dates for people with no birth or death", () => {
    for (const item of family.people) {
      if (item.birth || item.death) {
        continue;
      }
      expect(fichaFromPerson(item).lifeProse, item.displayName).toBe(
        item.place ? `De ${item.place}.` : null,
      );
    }
  });
});
