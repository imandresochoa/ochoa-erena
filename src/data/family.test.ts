import { describe, expect, it } from "vitest";
import familyJson from "@/data/family.json";
import { family, defaultPerson } from "@/data/family";
import { DEFAULT_FOCUS_NAME } from "@/domain/types";
import { findExactName, suggestPeople } from "@/domain/search";
import { parentsOf, siblingsOf, visiblePeople } from "@/domain/graph";
import { layoutPedigree } from "@/domain/layout";
import { asPersonId } from "@/domain/types";

type RawLink = { label?: string; href?: string };
type RawSource = RawLink & { kind?: string; mark?: string };
type RawPerson = {
  id: string;
  displayName: string;
  summary: string;
  links?: RawLink[];
  sources?: RawSource[];
  files?: unknown;
};

function rawPeople(): RawPerson[] {
  return familyJson.people as RawPerson[];
}

function rawPerson(id: string): RawPerson {
  const person = rawPeople().find((item) => item.id === id);
  if (!person) {
    throw new Error(`Missing person ${id}`);
  }
  return person;
}

function hrefsOf(id: string): string[] {
  return (rawPerson(id).links ?? [])
    .map((link) => link.href)
    .filter((href): href is string => Boolean(href));
}

describe("family snapshot", () => {
  it("loads Andrés as the default focus", () => {
    expect(defaultPerson?.displayName).toBe(DEFAULT_FOCUS_NAME);
    expect(findExactName(family.people, "andres martin ochoa erena")?.id).toBe(
      defaultPerson?.id,
    );
  });

  it("records Mercedes as sister of Andrés after CONF Andrés 2026-09-06", () => {
    const andres = asPersonId("andres-martin-ochoa-erena");
    const mercedes = asPersonId("mercedes-ochoa-erena");
    const mercedesPerson = family.people.find((person) => person.id === mercedes);
    expect(mercedesPerson?.displayName).toBe("Mercedes Ochoa Erena");
    expect(mercedesPerson?.birth).toEqual({
      year: 1990,
      approx: false,
      text: "1990-10-05 [CONF Andrés 2026-09-06]",
    });
    expect(siblingsOf(family, andres)).toEqual([mercedes]);
    expect(siblingsOf(family, mercedes)).toContain(andres);
    expect(parentsOf(family, mercedes)).toEqual([
      asPersonId("francisco-javier-ochoa-palop"),
      asPersonId("maria-aurora-erena-camacho"),
    ]);
    expect(
      family.edges.some(
        (edge) =>
          edge.kind === "sibling" &&
          ((edge.from === andres && edge.to === mercedes) ||
            (edge.from === mercedes && edge.to === andres)),
      ),
    ).toBe(true);
  });

  it("records Darío de Dios Ochoa as child of Mercedes without a father person", () => {
    const mercedes = asPersonId("mercedes-ochoa-erena");
    const dario = asPersonId("dario-de-dios-ochoa");
    const darioPerson = family.people.find((person) => person.id === dario);
    expect(darioPerson?.displayName).toBe("Darío de Dios Ochoa");
    expect(darioPerson?.birth).toEqual({
      year: 2015,
      approx: false,
      text: "2015-10-18 [CONF Andrés 2026-09-06]",
    });
    expect(parentsOf(family, dario)).toEqual([mercedes]);
    expect(
      family.people.some(
        (person) =>
          person.id !== dario &&
          /de-dios|de dios/i.test(`${person.id} ${person.displayName}`),
      ),
    ).toBe(false);
    expect(family.people.some((person) => person.displayName.trim() === "")).toBe(
      false,
    );
  });

  it("plus on Francisco reveals Matilde", () => {
    const andres = asPersonId("andres-martin-ochoa-erena");
    const francisco = asPersonId("francisco-javier-ochoa-palop");
    const matilde = asPersonId("matilde-ochoa-palop");
    expect(siblingsOf(family, francisco)).toContain(matilde);
    expect(visiblePeople(family, andres, []).has(matilde)).toBe(false);
    expect(visiblePeople(family, andres, [francisco]).has(matilde)).toBe(true);
    const layout = layoutPedigree(family, andres, [francisco]);
    expect(layout.nodes.some((node) => node.id === matilde)).toBe(true);
  });

  it("predicts accent-folded names from the snapshot", () => {
    const hits = suggestPeople(family.people, "maria aurora");
    expect(hits.some((person) => person.id === "maria-aurora-erena-camacho")).toBe(
      true,
    );
  });

  it("keeps José Ochoa Hidalgo as a hypothesis sibling", () => {
    const edge = family.edges.find(
      (item) =>
        item.kind === "sibling" &&
        (item.from === "jose-ochoa-hidalgo" || item.to === "jose-ochoa-hidalgo"),
    );
    expect(edge?.certainty).toBe("hypothesis");
  });

  it("locks CONF Andrés 2026-09-06: parents of Francisco Javier are confirmed", () => {
    const stamp = "[CONF Andrés 2026-09-06]";
    const father = family.edges.find(
      (edge) =>
        edge.kind === "parent" &&
        edge.from === "martin-ochoa-hidalgo" &&
        edge.to === "francisco-javier-ochoa-palop",
    );
    const mother = family.edges.find(
      (edge) =>
        edge.kind === "parent" &&
        edge.from === "matilde-palop-fuentes" &&
        edge.to === "francisco-javier-ochoa-palop",
    );
    expect(father?.certainty).toBe("confirmed");
    expect(mother?.certainty).toBe("confirmed");
    expect(rawPerson("francisco-javier-ochoa-palop").summary).toContain(stamp);
    expect(rawPerson("martin-ochoa-hidalgo").summary).toContain(stamp);
    expect(rawPerson("matilde-palop-fuentes").summary).toContain(stamp);
    for (const id of [
      "francisco-javier-ochoa-palop",
      "martin-ochoa-hidalgo",
      "matilde-palop-fuentes",
    ]) {
      expect(rawPerson(id).marks).not.toContain("C");
      expect(rawPerson(id).marks).not.toContain("N");
    }
  });

  it("locks CONF Andrés 2026-09-06: Martín María is confirmed with a confirmed filial link", () => {
    const stamp = "[CONF Andrés 2026-09-06]";
    const son = family.edges.find(
      (edge) =>
        edge.kind === "parent" &&
        edge.from === "martin-maria-ochoa-de-eguiyara-antia" &&
        edge.to === "martin-ochoa-hidalgo",
    );
    expect(son?.certainty).toBe("confirmed");
    expect(rawPerson("martin-maria-ochoa-de-eguiyara-antia").summary).toContain(
      stamp,
    );
    expect(rawPerson("martin-maria-ochoa-de-eguiyara-antia").summary).toMatch(
      /Autia.*hipótesis/,
    );
    expect(rawPerson("martin-maria-ochoa-de-eguiyara-antia").marks).not.toContain(
      "C",
    );
    expect(rawPerson("martin-maria-ochoa-de-eguiyara-antia").marks).not.toContain(
      "N",
    );
  });

  it("leaves other real hypotheses in place after the CONF Andrés trunk lock", () => {
    const jose = family.edges.find(
      (item) =>
        item.kind === "sibling" &&
        (item.from === "jose-ochoa-hidalgo" || item.to === "jose-ochoa-hidalgo"),
    );
    const andresErena = family.edges.find(
      (edge) =>
        edge.kind === "parent" &&
        edge.from === "andres-erena" &&
        edge.to === "antonio-erena-liebana",
    );
    const capilla = family.edges.find(
      (edge) =>
        edge.kind === "parent" &&
        edge.from === "capilla-liebana" &&
        edge.to === "antonio-erena-liebana",
    );
    expect(jose?.certainty).toBe("hypothesis");
    expect(andresErena?.certainty).toBe("hypothesis");
    expect(capilla?.certainty).toBe("hypothesis");
  });

  it("keeps the snapshot size and does not invent people, Zufiaur, or files", () => {
    expect(rawPeople()).toHaveLength(63);
    expect(family.people).toHaveLength(63);
    expect(family.edges).toHaveLength(100);
    expect(
      rawPeople().some(
        (person) =>
          person.id === "martin-zufiaur" ||
          person.id === "maria-ruiz-de-ibarreta" ||
          person.id === "irene-ochoa-hidalgo",
      ),
    ).toBe(false);
    for (const person of rawPeople()) {
      expect(person.files).toBeUndefined();
    }
  });

  it("keeps #20 catalog URLs on people who already named those ids", () => {
    expect(hrefsOf("juan-jose-ochoa-de-eguiara")).toEqual([
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=802997",
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_matrimonios.php?id_matrimonio=69157",
    ]);
    expect(hrefsOf("gregoria-ochoa-antia")).toContain(
      "https://pares.mcu.es/ParesBusquedas20/catalogo/description/5461839",
    );
    expect(hrefsOf("candida-ochoa-antia")).toContain(
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=135978",
    );
    expect(hrefsOf("francisco-ochoa-antia")).toContain(
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=61861",
    );
    expect(hrefsOf("vicenta-ochoa-antia")).toContain(
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=62624",
    );
    expect(hrefsOf("martina-ochoa-antia")).toContain(
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=62913",
    );
    expect(hrefsOf("lino-ochoa-antia")).toContain(
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=67855",
    );
    expect(hrefsOf("manuel-palop-fuentes")).toEqual(
      expect.arrayContaining([
        "https://www.boe.es/boe/dias/1976/11/29/pdfs/A23753-23754.pdf",
        "https://www.corvet.es/libro_corvet__28_nov.pdf",
      ]),
    );
  });

  it("fills Emeterio catalog URLs already named in familia/fuentes.md", () => {
    const person = rawPerson("emeterio-guillerna");
    expect(hrefsOf("emeterio-guillerna")).toEqual([
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=69059",
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_matrimonios.php?id_matrimonio=6062",
      "https://pares.mcu.es/ParesBusquedas20/catalogo/description/5461839",
    ]);
    expect(person.sources).toEqual([
      {
        label: "AHDV 69059",
        href: "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=69059",
        kind: "ahdv",
        mark: "H",
      },
      {
        label: "AHDV 6062",
        href: "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_matrimonios.php?id_matrimonio=6062",
        kind: "ahdv",
        mark: "H",
      },
      {
        label: "PARES ESC,24187",
        href: "https://pares.mcu.es/ParesBusquedas20/catalogo/description/5461839",
        kind: "pares",
        mark: "H",
      },
    ]);
    expect(person.summary).toContain("AHDV 69059");
    expect(person.summary).toContain("AHDV 6062");
    expect(person.summary).toContain("ESC,24187");
    expect(person.summary).toMatch(/Hemeterio/);
    expect(person.summary).toMatch(/Ybañez/);
    expect(person.summary).toMatch(/Mendoza/);
    expect(person.summary).not.toMatch(/se unifica|grafía correcta/i);
  });

  it("fills the Antonio Camacho Viñas person URL already named in familia/fuentes.md", () => {
    const person = rawPerson("antonio-camacho-vinas");
    expect(hrefsOf("antonio-camacho-vinas")).toEqual([
      "https://gw.geneanet.org/aerec5?lang=es&n=camacho+vinas&p=antonio",
    ]);
    expect(person.sources).toEqual([
      {
        label: "Antonio Camacho Viñas, aerec5",
        href: "https://gw.geneanet.org/aerec5?lang=es&n=camacho+vinas&p=antonio",
        kind: "geneanet",
        mark: "AEC",
      },
    ]);
    expect(person.summary).toMatch(/no civil|no es partida/i);
    expect(person.summary).toMatch(/oficio no se escribe/i);
  });

  it("leaves people with no open ficha or no person URL blocked", () => {
    for (const id of [
      "heliodoro-palop-padron",
      "matilde-fuentes-lopez",
    ]) {
      const person = rawPerson(id);
      expect(person.links ?? []).toEqual([]);
      expect(person.sources).toBeUndefined();
      expect(person.summary).toContain("No hay ficha en abierto");
    }

    for (const id of [
      "silvia-erena-camacho",
      "andres-erena-camacho",
      "angustias-erena-lopez",
      "manuel-erena-lopez",
      "dolores-erena-lopez",
      "patrocinio-erena",
      "antonio-erena-lopez",
      "jose-ochoa-hidalgo",
      "andres-erena",
      "capilla-liebana",
      "dolores-lopez-martos",
      "antonio-camacho-liebana",
      "mercedes-vinas-lopez",
      "juan-ochoa-de-eguiara",
      "josefa-saez-de-eguilaz",
      "josefa-hidalgo-de-la-vega",
      "francisco-antia-zubicain",
      "vicenta-ruiz-de-eguino",
      "manuel-martinez-de-albeniz-albizu",
      "andres-martin-ochoa-erena",
      "mercedes-ochoa-erena",
      "dario-de-dios-ochoa",
      "maria-aurora-erena-camacho",
      "aurora-camacho-vinas",
    ]) {
      expect(hrefsOf(id)).toEqual([]);
      expect(rawPerson(id).sources).toBeUndefined();
    }
  });

  it("tightens thin AHDV sibling summaries with baptism facts already on the card", () => {
    expect(rawPerson("buenaventura-ochoa-antia").summary).toContain("1859-07-14");
    expect(rawPerson("buenaventura-ochoa-antia").summary).toContain("San Miguel");
    expect(rawPerson("vicenta-ochoa-antia").summary).toContain("1869-10-27");
    expect(rawPerson("vicenta-ochoa-antia").summary).toContain("San Pedro");
    expect(rawPerson("martina-ochoa-antia").summary).toContain("1873-04-25");
    expect(rawPerson("lino-ochoa-antia").summary).toContain("1877-09-23");
  });

  it("keeps AEC-only cards as uncle-tree facts, not partidas", () => {
    for (const id of [
      "silvia-erena-camacho",
      "andres-erena-camacho",
      "angustias-erena-lopez",
      "manuel-erena-lopez",
      "dolores-erena-lopez",
      "patrocinio-erena",
      "antonio-erena-lopez",
    ]) {
      expect(rawPerson(id).summary).toMatch(/no es partida|no es partida parroquial/i);
    }
  });
});
