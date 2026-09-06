import { describe, expect, it } from "vitest";
import familyJson from "@/data/family.json";
import { family, defaultPerson } from "@/data/family";
import { DEFAULT_FOCUS_NAME } from "@/domain/types";
import { findExactName, suggestPeople } from "@/domain/search";
import { siblingsOf, visiblePeople } from "@/domain/graph";
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

  it("does not invent Mercedes as a sibling of Andrés", () => {
    expect(siblingsOf(family, asPersonId("andres-martin-ochoa-erena"))).toEqual([]);
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

  it("keeps the snapshot size and does not invent people, Zufiaur, or files", () => {
    expect(rawPeople()).toHaveLength(61);
    expect(family.people).toHaveLength(61);
    expect(family.edges).toHaveLength(96);
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
