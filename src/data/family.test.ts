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
  marks?: string[];
  birth?: { text?: string };
  death?: { text?: string };
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

function parentEdge(from: string, to: string) {
  return family.edges.find(
    (edge) => edge.kind === "parent" && edge.from === from && edge.to === to,
  );
}

function spouseEdge(a: string, b: string) {
  return family.edges.find(
    (edge) =>
      edge.kind === "spouse" &&
      ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)),
  );
}

function siblingEdge(a: string, b: string) {
  return family.edges.find(
    (edge) =>
      edge.kind === "sibling" &&
      ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)),
  );
}

const PRODUCT_JARGON =
  /\[TO\]|CONF Andrés|tradición oral|fuente oral|árbol oral|según Andrés/i;

const SEL_LEAD =
  "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el sel de Egiara.";

const SEL_ALAVA_MENTION =
  "Una fuente secundaria (Bergarako baserriak – Egiara Gañekoa) menciona que una rama de este solar pasó a Álava con el apellido Ochoa de Eguiara (Ozaeta / Barrundia), y cita a Manuel Antonio Ochoa de Eguiara (baut. Zalduendo 1740, hidalguía 1793). El bisabuelo Martín María Ochoa de Eguiyara Antia vino de Álava (Aspárrena–Vitoria). Eso da coherencia geográfica con esa mención de una rama a Álava como Ochoa de Eguiara. Sigue siendo posibilidad / mención: no es filiación confirmada al sel de Bergara del siglo XV ni a Manuel Antonio.";

const SEL_BODY = [
  "El sel de Eguiara (Egiara) aparece en el fondo Yrízar (Archivo de la Fundación Sancho el Sabio). El 31 de diciembre de 1444, García Ibáñez de Jáuregui vende el sel de Eguiara Goitia a Juan de Eguiara (también Juan Sendo de Eguiara); escribano Juan Pérez de Aróstegui. En septiembre de 1447 una sentencia confirma la posesión del sel a favor de Juan Sendoa de Eguiara. En 1477 hay informaciones de testigos sobre el mismo sel.",
  "En Bergara se documenta el solar / caserío Egiara Gañekoa (Egiara Suso), historia de toponimia y casería ligada al mismo nombre. Eso es contexto del solar: no prueba, por sí sola, una cadena padre–hijo hasta los Ochoa de Eguiara de Aspárrena (Egino / Albéniz) documentados en los siglos XVIII–XIX.",
  SEL_ALAVA_MENTION,
].join("\n\n");

const BERGARA_BASERRIAK_HREF =
  "https://sites.google.com/site/bergarakobaserriak/auzoak-barrios/elosua/egiara-gañekoa";

const TOUCHED_OCHOA_EGUIARA = [
  "juan-jose-ochoa-de-eguiara",
  "juan-ochoa-de-eguiara",
  "martina-martinez-de-ezcurra",
  "martin-maria-ochoa-de-eguiyara-antia",
  "martin-ochoa-hidalgo",
  "phelipa-zufiaur-ybarreta",
  "manuel-ochoa-de-yara",
  "maria-ruiz-de-gauna",
  "martin-ochoa-lara",
  "josepha-lopez-de-munain",
  "juan-antonio-ruiz-de-gauna",
  "mariana-ervina",
  "manuela-yaza-ruiz-de-gauna",
  "jorge-antonio-eyara",
  "martin-zufiaur",
  "maria-ruiz-de-ibarreta",
];

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
      text: "1990-10-05",
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
      text: "2015-10-18",
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
    const son = family.edges.find(
      (edge) =>
        edge.kind === "parent" &&
        edge.from === "martin-maria-ochoa-de-eguiyara-antia" &&
        edge.to === "martin-ochoa-hidalgo",
    );
    expect(son?.certainty).toBe("confirmed");
    expect(rawPerson("martin-maria-ochoa-de-eguiyara-antia").summary).toMatch(
      /Autia/,
    );
    expect(rawPerson("martin-maria-ochoa-de-eguiyara-antia").marks).not.toContain(
      "C",
    );
    expect(rawPerson("martin-maria-ochoa-de-eguiyara-antia").marks).not.toContain(
      "N",
    );
  });

  it("leaves José Ochoa Hidalgo as the remaining near-trunk hypothesis", () => {
    const jose = family.edges.find(
      (item) =>
        item.kind === "sibling" &&
        (item.from === "jose-ochoa-hidalgo" || item.to === "jose-ochoa-hidalgo"),
    );
    expect(jose?.certainty).toBe("hypothesis");
  });

  it("locks Andrés maternal CONF through bisabuelos and keeps Erena × Capilla HIP", () => {
    expect(
      parentEdge("maria-aurora-erena-camacho", "andres-martin-ochoa-erena")
        ?.certainty,
    ).toBe("confirmed");
    expect(
      parentEdge("nicomedes-andres-erena-lopez", "maria-aurora-erena-camacho")
        ?.certainty,
    ).toBe("confirmed");
    expect(
      parentEdge("aurora-camacho-vinas", "maria-aurora-erena-camacho")?.certainty,
    ).toBe("confirmed");
    expect(
      parentEdge("antonio-erena-liebana", "nicomedes-andres-erena-lopez")
        ?.certainty,
    ).toBe("confirmed");
    expect(
      parentEdge("dolores-lopez-martos", "nicomedes-andres-erena-lopez")
        ?.certainty,
    ).toBe("confirmed");
    expect(
      spouseEdge("antonio-erena-liebana", "dolores-lopez-martos")?.certainty,
    ).toBe("confirmed");
    expect(
      parentEdge("antonio-camacho-liebana", "aurora-camacho-vinas")?.certainty,
    ).toBe("confirmed");
    expect(
      parentEdge("mercedes-vinas-lopez", "aurora-camacho-vinas")?.certainty,
    ).toBe("confirmed");
    expect(
      spouseEdge("antonio-camacho-liebana", "mercedes-vinas-lopez")?.certainty,
    ).toBe("confirmed");
    expect(parentEdge("andres-erena", "antonio-erena-liebana")?.certainty).toBe(
      "hypothesis",
    );
    expect(parentEdge("capilla-liebana", "antonio-erena-liebana")?.certainty).toBe(
      "hypothesis",
    );
    expect(spouseEdge("andres-erena", "capilla-liebana")?.certainty).toBe(
      "hypothesis",
    );
    expect(rawPerson("andres-erena").marks).toEqual(["AEC"]);
    expect(rawPerson("capilla-liebana").marks).toEqual(["AEC"]);
    expect(rawPerson("andres-erena").summary).toMatch(/Zapatero|Sin partida/);
    expect(rawPerson("capilla-liebana").summary).toMatch(/Jamilena|Sin partida/);
  });

  it("keeps the snapshot size and does not invent people or files", () => {
    expect(rawPeople()).toHaveLength(73);
    expect(family.people).toHaveLength(73);
    expect(family.edges).toHaveLength(118);
    expect(rawPeople().some((person) => person.id === "irene-ochoa-hidalgo")).toBe(
      false,
    );
    expect(rawPeople().some((person) => /sendo/i.test(person.id))).toBe(false);
    for (const person of rawPeople()) {
      expect(person.files).toBeUndefined();
    }
  });

  it("parses every snapshot person with empty files", () => {
    for (const person of family.people) {
      expect(person.files).toEqual([]);
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

  it("extends the Aspárrena Ochoa trunk with named AHDV generations", () => {
    expect(parentEdge("juan-ochoa-de-eguiara", "juan-jose-ochoa-de-eguiara")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("martina-martinez-de-ezcurra", "juan-jose-ochoa-de-eguiara")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("manuel-ochoa-de-yara", "juan-ochoa-de-eguiara")?.certainty).toBe(
      "hypothesis",
    );
    expect(parentEdge("maria-ruiz-de-gauna", "juan-ochoa-de-eguiara")?.certainty).toBe(
      "hypothesis",
    );
    expect(spouseEdge("manuel-ochoa-de-yara", "maria-ruiz-de-gauna")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("martin-ochoa-lara", "manuel-ochoa-de-yara")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("josepha-lopez-de-munain", "manuel-ochoa-de-yara")?.certainty).toBe(
      "confirmed",
    );
    expect(spouseEdge("martin-ochoa-lara", "josepha-lopez-de-munain")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("juan-antonio-ruiz-de-gauna", "maria-ruiz-de-gauna")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("mariana-ervina", "maria-ruiz-de-gauna")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("manuel-ochoa-de-yara", "manuela-yaza-ruiz-de-gauna")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("maria-ruiz-de-gauna", "manuela-yaza-ruiz-de-gauna")?.certainty).toBe(
      "confirmed",
    );
    expect(siblingEdge("juan-ochoa-de-eguiara", "manuela-yaza-ruiz-de-gauna")?.certainty).toBe(
      "hypothesis",
    );
    expect(parentEdge("juan-ochoa-de-eguiara", "jorge-antonio-eyara")?.certainty).toBe(
      "hypothesis",
    );
    expect(parentEdge("martina-martinez-de-ezcurra", "jorge-antonio-eyara")?.certainty).toBe(
      "hypothesis",
    );
    expect(siblingEdge("juan-jose-ochoa-de-eguiara", "jorge-antonio-eyara")?.certainty).toBe(
      "hypothesis",
    );
    expect(parentEdge("martin-zufiaur", "phelipa-zufiaur-ybarreta")?.certainty).toBe(
      "confirmed",
    );
    expect(parentEdge("maria-ruiz-de-ibarreta", "phelipa-zufiaur-ybarreta")?.certainty).toBe(
      "confirmed",
    );
  });

  it("keeps ten hypothesis edges above the bisabuelos and does not make the 1444 solar a father", () => {
    const hip = family.edges.filter((edge) => edge.certainty === "hypothesis");
    expect(hip).toHaveLength(10);
    expect(
      hip.some(
        (edge) =>
          edge.from === "andres-erena" ||
          edge.to === "andres-erena" ||
          edge.from === "capilla-liebana" ||
          edge.to === "capilla-liebana",
      ),
    ).toBe(true);
    for (const person of family.people) {
      expect(person.displayName).not.toMatch(/Sendo/i);
      expect(person.id).not.toMatch(/sendo|1444/i);
    }
    expect(
      family.edges.some((edge) => /sendo|1444/i.test(`${edge.from} ${edge.to}`)),
    ).toBe(false);
    expect(parentsOf(family, asPersonId("juan-ochoa-de-eguiara"))).toEqual([
      asPersonId("manuel-ochoa-de-yara"),
      asPersonId("maria-ruiz-de-gauna"),
    ]);
    expect(parentsOf(family, asPersonId("martin-ochoa-lara"))).toEqual([]);
    expect(parentsOf(family, asPersonId("josepha-lopez-de-munain"))).toEqual([]);
  });

  it("records AHDV years, places, and catalog links on the new Aspárrena people", () => {
    const manuel = family.people.find((person) => person.id === "manuel-ochoa-de-yara");
    const maria = family.people.find((person) => person.id === "maria-ruiz-de-gauna");
    const juan = family.people.find((person) => person.id === "juan-ochoa-de-eguiara");
    const jorge = family.people.find((person) => person.id === "jorge-antonio-eyara");
    const manuela = family.people.find(
      (person) => person.id === "manuela-yaza-ruiz-de-gauna",
    );
    expect(manuel?.birth).toEqual({
      year: 1759,
      approx: false,
      text: "baut. 1759-11-04, Zalduondo",
    });
    expect(manuel?.place).toBe("Zalduondo");
    expect(maria?.birth).toEqual({
      year: 1748,
      approx: false,
      text: "baut. 1748-04-07, Egino",
    });
    expect(maria?.place).toBe("Egino, Aspárrena");
    expect(juan?.birth).toEqual({
      year: 1786,
      approx: true,
      text: "candidato baut. 1786-02-09, Egino",
    });
    expect(jorge?.birth).toEqual({
      year: 1814,
      approx: false,
      text: "baut. 1814-04-23, Andoin",
    });
    expect(manuela?.birth).toEqual({
      year: 1789,
      approx: false,
      text: "baut. 1789-05-11, Egino",
    });
    expect(hrefsOf("manuel-ochoa-de-yara")).toEqual(
      expect.arrayContaining([
        "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=680327",
        "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_matrimonios.php?id_matrimonio=167459",
      ]),
    );
    expect(hrefsOf("maria-ruiz-de-gauna")).toContain(
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=802400",
    );
    expect(hrefsOf("martin-ochoa-lara")).toEqual(
      expect.arrayContaining([
        "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_matrimonios.php?id_matrimonio=147634",
        "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_difuntos.php?id_difunto=222064",
      ]),
    );
    expect(hrefsOf("juan-ochoa-de-eguiara")).toEqual(
      expect.arrayContaining([
        "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=802765",
      ]),
    );
    expect(hrefsOf("juan-ochoa-de-eguiara")).not.toContain(
      "https://catalogo.sanchoelsabio.eus/Record/AtoM-677383",
    );
    expect(hrefsOf("jorge-antonio-eyara")).toContain(
      "https://internet.ahdv-geah.org/paginas/indexacion/n_ficha_bautismos.php?id_bautismo=29843",
    );
    const years = family.people
      .filter((person) =>
        [
          "manuel-ochoa-de-yara",
          "maria-ruiz-de-gauna",
          "manuela-yaza-ruiz-de-gauna",
          "jorge-antonio-eyara",
        ].includes(person.id),
      )
      .map((person) => person.birth?.year)
      .filter((year): year is number => typeof year === "number");
    expect(Math.min(...years)).toBe(1748);
  });

  it("writes reader prose on touched Ochoa and Eguiara cards, without oral jargon", () => {
    for (const id of TOUCHED_OCHOA_EGUIARA) {
      const person = rawPerson(id);
      expect(person.summary, id).not.toMatch(PRODUCT_JARGON);
      for (const source of person.sources ?? []) {
        expect(source.label, `${id} ${source.label}`).not.toMatch(PRODUCT_JARGON);
      }
    }
    expect(rawPerson("juan-jose-ochoa-de-eguiara").summary).toMatch(/Aspárrena|Egino/);
    expect(rawPerson("juan-ochoa-de-eguiara").summary).toMatch(/Sel de Egiara/);
    expect(rawPerson("juan-ochoa-de-eguiara").summary).toMatch(
      /no (es|son) (una )?filiaci[oó]n|no (es|son) padres/i,
    );
    expect(rawPerson("martin-ochoa-lara").summary).toMatch(/Zalduondo|Lara|Munain/);
    expect(rawPerson("phelipa-zufiaur-ybarreta").summary).toMatch(/Zufiaur|Ibarreta/);
  });

  it("keeps every person summary and source label free of oral jargon", () => {
    for (const person of rawPeople()) {
      expect(person.summary, person.id).not.toMatch(PRODUCT_JARGON);
      if (person.birth?.text) {
        expect(person.birth.text, `${person.id} birth`).not.toMatch(PRODUCT_JARGON);
      }
      if (person.death?.text) {
        expect(person.death.text, `${person.id} death`).not.toMatch(PRODUCT_JARGON);
      }
      for (const link of person.links ?? []) {
        expect(link.label, `${person.id} ${link.label}`).not.toMatch(PRODUCT_JARGON);
      }
      for (const source of person.sources ?? []) {
        expect(source.label, `${person.id} ${source.label}`).not.toMatch(PRODUCT_JARGON);
      }
    }
  });

  it("stores Sel de Egiara as a lateral fog context, not as a person or parent", () => {
    const raw = familyJson as {
      contexts?: Array<{
        id?: string;
        kind?: string;
        displayName?: string;
        zone?: string;
        branch?: string;
        todo?: string;
        summary?: string;
        history?: string;
        anchors?: string[];
        vinculaciones?: Array<{ label?: string; note?: string }>;
        links?: RawLink[];
        sources?: RawSource[];
      }>;
    };
    const sel = family.contexts.find((item) => item.id === "sel-de-egiara");
    const rawSel = raw.contexts?.find((item) => item.id === "sel-de-egiara");
    expect(sel).toBeDefined();
    expect(rawSel).toBeDefined();
    expect(family.people.some((person) => person.id === "sel-de-egiara")).toBe(false);
    expect(
      family.edges.some(
        (edge) => edge.from === "sel-de-egiara" || edge.to === "sel-de-egiara",
      ),
    ).toBe(false);
    expect(sel?.displayName).toBe("Sel de Egiara");
    expect(sel?.kind).toBe("solar");
    expect(sel?.zone).toBe("fog");
    expect(sel?.branch).toBe("lateral");
    expect(sel?.summary).toBe(SEL_LEAD);
    expect(sel?.history).toBe(SEL_BODY);
    expect(sel?.todo).toMatch(/neblina|fog/i);
    expect(sel?.todo).toMatch(/tronco/i);
    expect(sel?.anchors).toEqual([
      "juan-jose-ochoa-de-eguiara",
      "juan-ochoa-de-eguiara",
    ]);
    expect(sel?.summary).not.toMatch(PRODUCT_JARGON);
    expect(sel?.history).not.toMatch(PRODUCT_JARGON);
    expect(sel?.vinculaciones.length).toBeGreaterThanOrEqual(3);
    const vinculoText = (sel?.vinculaciones ?? [])
      .map((item) => `${item.label} ${item.note}`)
      .join(" ");
    expect(vinculoText).toMatch(/nombre compartido/i);
    expect(vinculoText).toMatch(/Juan José|1828/);
    expect(vinculoText).toMatch(/HIP|hipótesis/i);
    expect(vinculoText).toMatch(/padre|filiaci[oó]n|siglo XV|s\.XV/i);
    for (const item of sel?.vinculaciones ?? []) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.note.length).toBeGreaterThan(0);
      expect(item.note).not.toMatch(/undefined|por definir|tbd/i);
      expect(item.note).not.toMatch(PRODUCT_JARGON);
    }
    expect((rawSel?.links ?? []).map((link) => link.href)).toEqual(
      expect.arrayContaining([
        "https://catalogo.sanchoelsabio.eus/Record/AtoM-677383",
        "https://artxiboa.sanchoelsabio.eus/fss-ud677383",
        "https://catalogo.sanchoelsabio.eus/Record/AtoM-673131",
        BERGARA_BASERRIAK_HREF,
      ]),
    );
  });

  it("keeps the Bergarako Álava note as possibility, not a person or parent edge", () => {
    const sel = family.contexts.find((item) => item.id === "sel-de-egiara");
    const raw = familyJson as {
      contexts?: Array<{
        history?: string;
        vinculaciones?: Array<{ label?: string; note?: string }>;
        links?: RawLink[];
        sources?: RawSource[];
      }>;
    };
    const rawSel = raw.contexts?.find((item) => item.id === "sel-de-egiara");
    const fichaCopy = [
      sel?.summary,
      sel?.history,
      ...(sel?.vinculaciones ?? []).map((item) => `${item.label} ${item.note}`),
    ].join("\n");

    expect(sel?.history).toContain(SEL_ALAVA_MENTION);
    expect(fichaCopy).toMatch(/posibilidad|menci[oó]n/i);
    expect(fichaCopy).toMatch(/Bergarako baserriak/);
    expect(fichaCopy).toMatch(/Ozaeta/);
    expect(fichaCopy).toMatch(/Barrundia/);
    expect(fichaCopy).toMatch(/Manuel Antonio Ochoa de Eguiara/);
    expect(fichaCopy).toMatch(/Zalduendo 1740/);
    expect(fichaCopy).toMatch(/hidalgu[ií]a 1793/);
    expect(fichaCopy).toMatch(/Martín María/);
    expect(fichaCopy).toMatch(/Aspárrena–Vitoria|Aspárrena-Vitoria/);
    expect(fichaCopy).toMatch(/coherencia geogr[aá]fica/i);
    expect(fichaCopy).toMatch(
      /no (es )?filiaci[oó]n confirmada|no filiaci[oó]n/i,
    );
    expect(fichaCopy).toMatch(/siglo XV|s\.XV/i);
    expect(fichaCopy).not.toMatch(PRODUCT_JARGON);

    const alavaVinculo = (sel?.vinculaciones ?? []).find((item) =>
      /[ÁA]lava/i.test(`${item.label} ${item.note}`),
    );
    expect(alavaVinculo?.label).toMatch(/posibilidad|menci[oó]n/i);
    expect(alavaVinculo?.note).toMatch(/Manuel Antonio/);
    expect(alavaVinculo?.note).toMatch(/Martín María/);
    expect(alavaVinculo?.note).toMatch(/coherencia geogr[aá]fica/i);
    expect(alavaVinculo?.note).toMatch(/no filiaci[oó]n/i);

    expect((rawSel?.links ?? []).map((link) => link.href)).toContain(
      BERGARA_BASERRIAK_HREF,
    );
    expect((rawSel?.sources ?? []).map((source) => source.href)).toContain(
      BERGARA_BASERRIAK_HREF,
    );

    expect(
      family.people.some((person) => /manuel-antonio/i.test(person.id)),
    ).toBe(false);
    expect(
      family.people.some((person) =>
        /Manuel Antonio Ochoa de Eguiara/i.test(person.displayName),
      ),
    ).toBe(false);
    expect(family.people).toHaveLength(73);
    expect(family.edges).toHaveLength(118);
  });

  it("stores Manuel Antonio and Juan José de Eguiara y Eguren as context nodes, not parents", () => {
    const raw = familyJson as {
      contexts?: Array<{
        id?: string;
        kind?: string;
        displayName?: string;
        place?: string;
        zone?: string;
        branch?: string;
        summary?: string;
        history?: string;
        anchors?: string[];
        vinculaciones?: Array<{ label?: string; note?: string }>;
        links?: RawLink[];
        sources?: RawSource[];
      }>;
    };

    const manuel = family.contexts.find(
      (item) => item.id === "manuel-antonio-ochoa-de-eguiara",
    );
    const juanJoseMx = family.contexts.find(
      (item) => item.id === "juan-jose-de-eguiara-y-eguren",
    );
    const rawManuel = raw.contexts?.find(
      (item) => item.id === "manuel-antonio-ochoa-de-eguiara",
    );
    const rawJuanJoseMx = raw.contexts?.find(
      (item) => item.id === "juan-jose-de-eguiara-y-eguren",
    );

    expect(family.contexts.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "sel-de-egiara",
        "manuel-antonio-ochoa-de-eguiara",
        "juan-jose-de-eguiara-y-eguren",
      ]),
    );
    expect(manuel).toBeDefined();
    expect(juanJoseMx).toBeDefined();

    for (const id of [
      "manuel-antonio-ochoa-de-eguiara",
      "juan-jose-de-eguiara-y-eguren",
    ]) {
      expect(family.people.some((person) => person.id === id)).toBe(false);
      expect(
        family.edges.some((edge) => edge.from === id || edge.to === id),
      ).toBe(false);
    }
    expect(
      family.people.some((person) => person.id === "nicolas-de-eguiara-y-eguren"),
    ).toBe(false);
    expect(juanJoseMx?.id).not.toBe("juan-jose-ochoa-de-eguiara");
    expect(family.people).toHaveLength(73);
    expect(family.edges).toHaveLength(118);

    expect(manuel?.kind).toBe("solar");
    expect(manuel?.zone).toBe("fog");
    expect(manuel?.branch).toBe("lateral");
    expect(manuel?.displayName).toBe("Manuel Antonio Ochoa de Eguiara");
    expect(manuel?.place).toMatch(/Ozaeta|Barrundia|Zalduondo/);
    expect(manuel?.anchors).toEqual([
      "juan-jose-ochoa-de-eguiara",
      "juan-ochoa-de-eguiara",
    ]);

    const manuelCopy = [
      manuel?.summary,
      manuel?.history,
      ...(manuel?.vinculaciones ?? []).map((item) => `${item.label} ${item.note}`),
    ].join("\n");
    expect(manuelCopy).toMatch(/Zalduondo 1740|baut\. Zalduondo/);
    expect(manuelCopy).toMatch(/hidalgu[ií]a 1793/);
    expect(manuelCopy).toMatch(/Ozaeta/);
    expect(manuelCopy).toMatch(/Barrundia/);
    expect(manuelCopy).toMatch(/posibilidad|rama a Álava/i);
    expect(manuelCopy).toMatch(/Sel de Egiara|sel de Egiara/);
    expect(manuelCopy).toMatch(/contexto/);
    expect(manuelCopy).toMatch(/no (es )?(una )?(filiaci[oó]n|padre)/i);
    expect(manuelCopy).not.toMatch(PRODUCT_JARGON);
    expect((manuel?.vinculaciones ?? []).length).toBeGreaterThanOrEqual(2);
    for (const item of manuel?.vinculaciones ?? []) {
      expect(item.note).not.toMatch(PRODUCT_JARGON);
    }
    expect((rawManuel?.links ?? []).map((link) => link.href)).toContain(
      BERGARA_BASERRIAK_HREF,
    );
    expect((rawManuel?.sources ?? []).map((source) => source.href)).toContain(
      BERGARA_BASERRIAK_HREF,
    );
    expect((rawManuel?.sources ?? []).every((source) => source.mark === "H")).toBe(
      true,
    );

    expect(juanJoseMx?.kind).toBe("solar");
    expect(juanJoseMx?.zone).toBe("fog");
    expect(juanJoseMx?.branch).toBe("lateral");
    expect(juanJoseMx?.displayName).toBe("Juan José de Eguiara y Eguren");
    expect(juanJoseMx?.place).toMatch(/M[eé]xico/);
    expect(juanJoseMx?.anchors).toEqual([
      "juan-jose-ochoa-de-eguiara",
      "juan-ochoa-de-eguiara",
    ]);

    const juanJoseCopy = [
      juanJoseMx?.summary,
      juanJoseMx?.history,
      ...(juanJoseMx?.vinculaciones ?? []).map(
        (item) => `${item.label} ${item.note}`,
      ),
    ].join("\n");
    expect(juanJoseCopy).toMatch(/pol[ií]grafo/i);
    expect(juanJoseCopy).toMatch(/Nicol[aá]s de Eguiara y Eguren/);
    expect(juanJoseCopy).toMatch(/Bergara|solar/);
    expect(juanJoseCopy).toMatch(/no (se )?funde|no es el Juan José Ochoa/i);
    expect(juanJoseCopy).toMatch(/Aspárrena/);
    expect(juanJoseCopy).toMatch(/no (hay )?filiaci[oó]n|sin filiaci[oó]n/i);
    expect(juanJoseCopy).not.toMatch(PRODUCT_JARGON);
    expect((juanJoseMx?.vinculaciones ?? []).length).toBeGreaterThanOrEqual(2);
    for (const item of juanJoseMx?.vinculaciones ?? []) {
      expect(item.note).not.toMatch(PRODUCT_JARGON);
    }
    expect((rawJuanJoseMx?.links ?? []).map((link) => link.href)).toContain(
      BERGARA_BASERRIAK_HREF,
    );
    expect((rawJuanJoseMx?.sources ?? []).map((source) => source.href)).toContain(
      BERGARA_BASERRIAK_HREF,
    );
    expect(
      (rawJuanJoseMx?.sources ?? []).every((source) => source.mark === "H"),
    ).toBe(true);
  });
});
