// "Zutano" is not in the given-name sex map of vinculo.ts, so it reads as unknown sex.
import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { gradoLabel } from "@/domain/grado";
import { parseFamily } from "@/domain/parse";
import {
  asPersonId,
  type Certainty,
  type EdgeKind,
  type FamilyGraph,
  type PersonId,
} from "@/domain/types";

const andres = asPersonId("andres-martin-ochoa-erena");
const francisco = asPersonId("francisco-javier-ochoa-palop");
const martinMaria = asPersonId("martin-maria-ochoa-de-eguiyara-antia");
const matilde = asPersonId("matilde-ochoa-palop");
const jose = asPersonId("jose-ochoa-hidalgo");
const mariaAurora = asPersonId("maria-aurora-erena-camacho");
const andresErena = asPersonId("andres-erena");
const capilla = asPersonId("capilla-liebana");
const rafael = asPersonId("rafael-ochoa-hidalgo");
const gregoria = asPersonId("gregoria-ochoa-antia");
const bruno = asPersonId("bruno-guillerna-ochoa");
const emeterio = asPersonId("emeterio-guillerna");

const REQUIRED_EXAMPLES: ReadonlyArray<readonly [PersonId, PersonId, string]> = [
  [andres, martinMaria, "Bisabuelo de Andrés"],
  [andres, francisco, "Padre de Andrés"],
  [andres, matilde, "Tía de Andrés"],
  [andres, jose, "Tío-abuelo de Andrés (hipótesis)"],
  [francisco, martinMaria, "Abuelo de Francisco Javier Ochoa Palop"],
  [francisco, francisco, "Persona foco"],
  [francisco, matilde, "Hermana de Francisco Javier Ochoa Palop"],
  [francisco, jose, "Tío de Francisco Javier Ochoa Palop (hipótesis)"],
  [andres, andresErena, "Tatarabuelo de Andrés"],
  [andres, capilla, "Tatarabuela de Andrés"],
  [francisco, andresErena, "Bisabuelo de Francisco Javier Ochoa Palop"],
  [francisco, capilla, "Bisabuela de Francisco Javier Ochoa Palop"],
];

const FOCUS_NAME = "Juan Foco Prueba";
const foco = asPersonId("foco");

type RawEdge = { kind: EdgeKind; from: string; to: string; certainty: Certainty };

function person(id: string, displayName: string) {
  return { id, displayName, marks: [] };
}

function edge(
  kind: EdgeKind,
  from: string,
  to: string,
  certainty: Certainty = "confirmed",
): RawEdge {
  return { kind, from, to, certainty };
}

function kinGraph(given: string): FamilyGraph {
  const people = [person("foco", FOCUS_NAME)];
  const edges: RawEdge[] = [];
  let child = "foco";
  for (let hop = 1; hop <= 7; hop += 1) {
    const id = `arriba-${hop}`;
    people.push(person(id, `${given} Ascendiente ${hop}`));
    edges.push(edge("parent", id, child));
    child = id;
  }
  let parent = "foco";
  for (let hop = 1; hop <= 4; hop += 1) {
    const id = `abajo-${hop}`;
    people.push(person(id, `${given} Descendiente ${hop}`));
    edges.push(edge("parent", parent, id));
    parent = id;
  }
  people.push(person("conyuge", `${given} Consorte`));
  edges.push(edge("spouse", "foco", "conyuge"));
  people.push(person("hermano", `${given} Colateral 0`));
  edges.push(edge("sibling", "foco", "hermano"));
  for (let hop = 1; hop <= 3; hop += 1) {
    const id = `tio-${hop}`;
    people.push(person(id, `${given} Colateral ${hop}`));
    edges.push(edge("sibling", `arriba-${hop}`, id));
  }
  return parseFamily({ people, edges });
}

const male = kinGraph("Pedro");
const female = kinGraph("María");
const unknown = kinGraph("Zutano");

function labelsFor(id: string): [string | null, string | null, string | null] {
  const personId = asPersonId(id);
  return [
    gradoLabel(male, foco, personId),
    gradoLabel(female, foco, personId),
    gradoLabel(unknown, foco, personId),
  ];
}

function phrases(m: string, f: string, u: string): [string, string, string] {
  return [`${m} de ${FOCUS_NAME}`, `${f} de ${FOCUS_NAME}`, `${u} de ${FOCUS_NAME}`];
}

describe("gradoLabel on the real family", () => {
  it("names the required people from Andrés and from Francisco Javier", () => {
    for (const [focusId, personId, expected] of REQUIRED_EXAMPLES) {
      expect(gradoLabel(family, focusId, personId)).toBe(expected);
    }
  });

  it("uses the short form only for Andrés and the full name for any other focus", () => {
    expect(gradoLabel(family, andres, mariaAurora)).toBe("Madre de Andrés");
    expect(gradoLabel(family, francisco, mariaAurora)).toBe(
      "Cónyuge de Francisco Javier Ochoa Palop",
    );
    expect(gradoLabel(family, martinMaria, gregoria)).toBe(
      "Hermana de Martín María Ochoa de Eguiyara Antia",
    );
  });

  it("names every real person as Persona foco for themselves", () => {
    for (const item of family.people) {
      expect(gradoLabel(family, item.id, item.id)).toBe("Persona foco");
    }
  });

  it("does not read the summary for the degree", () => {
    const misleading: FamilyGraph = {
      people: family.people.map((item) => ({ ...item, summary: "Primo de nadie." })),
      edges: family.edges,
      contexts: family.contexts,
    };
    for (const [focusId, personId, expected] of REQUIRED_EXAMPLES) {
      expect(gradoLabel(misleading, focusId, personId)).toBe(expected);
      expect(gradoLabel(misleading, focusId, personId)).toBe(
        gradoLabel(family, focusId, personId),
      );
    }
  });

  it("does not write paterno or materno on the degree line", () => {
    expect(gradoLabel(family, andres, rafael)).toBe("Tío-abuelo de Andrés");
    expect(gradoLabel(family, andres, gregoria)).toBe("Tía-bisabuela de Andrés");
    const labels = [
      ...REQUIRED_EXAMPLES.map(([focusId, personId]) => gradoLabel(family, focusId, personId)),
      gradoLabel(family, andres, rafael),
      gradoLabel(family, andres, gregoria),
    ];
    for (const label of labels) {
      expect(label).not.toBeNull();
      expect(label).not.toMatch(/paterno|materno/i);
    }
  });

  it("names the child of the tía-bisabuela as hijo, not primo", () => {
    expect(gradoLabel(family, andres, bruno)).toBe("Hijo de la tía-bisabuela de Andrés");
  });

  it("gives the spouse of the tía-bisabuela the same degree", () => {
    expect(gradoLabel(family, andres, emeterio)).toBe("Tío-bisabuelo de Andrés");
  });
});

describe("gradoLabel hop tables", () => {
  it("names the focus person as Persona foco", () => {
    expect(labelsFor("foco")).toEqual(["Persona foco", "Persona foco", "Persona foco"]);
  });

  it("names ancestors up to seven generations", () => {
    const rows: ReadonlyArray<readonly [number, string, string, string]> = [
      [1, "Padre", "Madre", "Padre/madre"],
      [2, "Abuelo", "Abuela", "Abuelo/a"],
      [3, "Bisabuelo", "Bisabuela", "Bisabuelo/a"],
      [4, "Tatarabuelo", "Tatarabuela", "Tatarabuelo/a"],
      [5, "Trastatarabuelo", "Trastatarabuela", "Trastatarabuelo/a"],
      [6, "Quinto abuelo", "Quinta abuela", "Quinto/a abuelo/a"],
      [7, "Sexto abuelo", "Sexta abuela", "Sexto/a abuelo/a"],
    ];
    for (const [hop, m, f, u] of rows) {
      expect(labelsFor(`arriba-${hop}`)).toEqual(phrases(m, f, u));
    }
  });

  it("names descendants down to four generations", () => {
    const rows: ReadonlyArray<readonly [number, string, string, string]> = [
      [1, "Hijo", "Hija", "Hijo/a"],
      [2, "Nieto", "Nieta", "Nieto/a"],
      [3, "Bisnieto", "Bisnieta", "Bisnieto/a"],
      [4, "Tataranieto", "Tataranieta", "Tataranieto/a"],
    ];
    for (const [hop, m, f, u] of rows) {
      expect(labelsFor(`abajo-${hop}`)).toEqual(phrases(m, f, u));
    }
  });

  it("names the spouse with one word for both sexes", () => {
    expect(labelsFor("conyuge")).toEqual(phrases("Cónyuge", "Cónyuge", "Cónyuge"));
  });

  it("names the sibling of the focus", () => {
    expect(labelsFor("hermano")).toEqual(phrases("Hermano", "Hermana", "Hermano/a"));
  });

  it("names siblings of ancestors up to the great-grandparent", () => {
    expect(labelsFor("tio-1")).toEqual(phrases("Tío", "Tía", "Tío/a"));
    expect(labelsFor("tio-2")).toEqual(
      phrases("Tío-abuelo", "Tía-abuela", "Tío/a-abuelo/a"),
    );
    expect(labelsFor("tio-3")).toEqual(
      phrases("Tío-bisabuelo", "Tía-bisabuela", "Tío/a-bisabuelo/a"),
    );
  });
});

describe("gradoLabel certainty and reach", () => {
  it("adds (hipótesis) when the path uses a hypothesis edge", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("abuelo", "Pedro Ascendiente 2"),
      ],
      edges: [
        edge("parent", "padre", "foco", "hypothesis"),
        edge("parent", "abuelo", "padre"),
      ],
    });
    expect(gradoLabel(graph, foco, asPersonId("padre"))).toBe(
      `Padre de ${FOCUS_NAME} (hipótesis)`,
    );
    expect(gradoLabel(graph, foco, asPersonId("abuelo"))).toBe(
      `Abuelo de ${FOCUS_NAME} (hipótesis)`,
    );
  });

  it("prefers a confirmed parent and sibling path over a short hypothesis sibling edge", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("tio", "José Colateral 1"),
      ],
      edges: [
        edge("parent", "padre", "foco"),
        edge("sibling", "padre", "tio"),
        edge("sibling", "foco", "tio", "hypothesis"),
      ],
    });
    expect(gradoLabel(graph, foco, asPersonId("tio"))).toBe(`Tío de ${FOCUS_NAME}`);
  });

  it("keeps a sibling through a shared confirmed parent free of the hypothesis mark", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("hermano", "José Colateral 0"),
      ],
      edges: [
        edge("parent", "padre", "foco"),
        edge("parent", "padre", "hermano"),
        edge("sibling", "foco", "hermano", "hypothesis"),
      ],
    });
    expect(gradoLabel(graph, foco, asPersonId("hermano"))).toBe(`Hermano de ${FOCUS_NAME}`);
  });

  it("returns null when there is no path", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("isla", "Pedro Isla"),
        person("isla-padre", "Pedro Isla Padre"),
      ],
      edges: [edge("parent", "padre", "foco"), edge("parent", "isla-padre", "isla")],
    });
    expect(gradoLabel(graph, foco, asPersonId("isla"))).toBeNull();
    expect(gradoLabel(graph, foco, asPersonId("isla-padre"))).toBeNull();
  });
});
