import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import {
  FICHA_KIN_HYPOTHESIS,
  FICHA_KIN_LABELS,
  fichaKin,
  type FichaKin,
  type FichaKinPerson,
} from "@/domain/ficha-kin";
import { childrenOf, parentEdge, parentsOf, requirePerson, siblingsOf } from "@/domain/graph";
import { LEGEND_ITEMS } from "@/domain/legend";
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
const mariaAurora = asPersonId("maria-aurora-erena-camacho");
const martinHidalgo = asPersonId("martin-ochoa-hidalgo");
const matildePalop = asPersonId("matilde-palop-fuentes");
const matilde = asPersonId("matilde-ochoa-palop");
const rafael = asPersonId("rafael-ochoa-hidalgo");
const jose = asPersonId("jose-ochoa-hidalgo");
const antonioLiebana = asPersonId("antonio-erena-liebana");
const andresErena = asPersonId("andres-erena");
const capilla = asPersonId("capilla-liebana");
const mercedes = asPersonId("mercedes-vinas-lopez");
const mercedesOchoa = asPersonId("mercedes-ochoa-erena");
const antonioCamacho = asPersonId("antonio-erena-camacho");
const silvia = asPersonId("silvia-erena-camacho");
const andresCamacho = asPersonId("andres-erena-camacho");

const SNAPSHOT_IDS = [andres, francisco, martinHidalgo, antonioLiebana, matilde, mariaAurora];

const EMPTY: FichaKin = { parents: [], children: [], siblings: [] };

const FOCUS_NAME = "Juan Foco Prueba";
const foco = asPersonId("foco");

type RawEdge = { kind: EdgeKind; from: string; to: string; certainty: Certainty };

function kin(
  id: PersonId,
  displayName: string,
  certainty: Certainty = "confirmed",
): FichaKinPerson {
  return { id, displayName, certainty };
}

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

function ids(people: FichaKinPerson[]): PersonId[] {
  return people.map((item) => item.id);
}

function certainties(people: FichaKinPerson[]): Certainty[] {
  return people.map((item) => item.certainty);
}

describe("fichaKin on the real family", () => {
  it("lists both parents of Andrés as confirmed and Mercedes as his sister", () => {
    expect(fichaKin(family, andres)).toEqual({
      parents: [
        kin(francisco, "Francisco Javier Ochoa Palop"),
        kin(mariaAurora, "María Aurora Erena Camacho"),
      ],
      children: [],
      siblings: [kin(mercedesOchoa, "Mercedes Ochoa Erena")],
    });
  });

  it("lists Francisco Javier with his parents, Andrés and Mercedes as children, and Matilde as confirmed sister", () => {
    expect(fichaKin(family, francisco)).toEqual({
      parents: [
        kin(martinHidalgo, "Martín Ochoa Hidalgo"),
        kin(matildePalop, "Matilde Palop Fuentes"),
      ],
      children: [
        kin(andres, "Andrés Martín Ochoa Erena"),
        kin(mercedesOchoa, "Mercedes Ochoa Erena"),
      ],
      siblings: [kin(matilde, "Matilde Ochoa Palop")],
    });
  });

  it("keeps Rafael confirmed and José as hypothesis among the siblings of Martín Ochoa Hidalgo", () => {
    expect(fichaKin(family, martinHidalgo).siblings).toEqual([
      kin(rafael, "Rafael Ochoa Hidalgo"),
      kin(jose, "José Ochoa Hidalgo", "hypothesis"),
    ]);
  });

  it("marks both parents of Antonio Erena Liébana as hypothesis", () => {
    expect(fichaKin(family, antonioLiebana).parents).toEqual([
      kin(andresErena, "Andrés Erena", "hypothesis"),
      kin(capilla, "Capilla Liébana", "hypothesis"),
    ]);
  });

  it("leaves Matilde Ochoa Palop without parents and keeps Francisco Javier as her confirmed brother", () => {
    const matildeKin = fichaKin(family, matilde);
    expect(matildeKin.parents).toEqual([]);
    expect(matildeKin.children).toEqual([]);
    expect(matildeKin.siblings).toEqual([kin(francisco, "Francisco Javier Ochoa Palop")]);
  });

  it("does not invent Mercedes Viñas López as a sibling of Andrés", () => {
    const andresKin = fichaKin(family, andres);
    expect(andresKin.siblings).toEqual([kin(mercedesOchoa, "Mercedes Ochoa Erena")]);
    expect(ids([...andresKin.parents, ...andresKin.children, ...andresKin.siblings])).not.toContain(
      mercedes,
    );
  });

  it("marks siblings inferred from a shared confirmed parent as confirmed", () => {
    const explicit = family.edges.some(
      (item) => item.kind === "sibling" && (item.from === mariaAurora || item.to === mariaAurora),
    );
    expect(explicit).toBe(false);
    expect(fichaKin(family, mariaAurora).siblings).toEqual([
      kin(antonioCamacho, "Antonio Erena Camacho"),
      kin(silvia, "Silvia Erena Camacho"),
      kin(andresCamacho, "Andrés Erena Camacho"),
    ]);
  });

  it("mirrors the graph helpers in id, order, and display name for every person", () => {
    for (const item of family.people) {
      const result = fichaKin(family, item.id);
      expect(ids(result.parents)).toEqual(parentsOf(family, item.id));
      expect(ids(result.children)).toEqual(childrenOf(family, item.id));
      expect(ids(result.siblings)).toEqual(siblingsOf(family, item.id));
      for (const relative of [...result.parents, ...result.children, ...result.siblings]) {
        expect(relative.displayName).toBe(requirePerson(family, relative.id).displayName);
      }
    }
  });

  it("reads parent and child certainty from the parent edge for every person", () => {
    for (const item of family.people) {
      const result = fichaKin(family, item.id);
      for (const parent of result.parents) {
        expect(parent.certainty).toBe(parentEdge(family, parent.id, item.id)?.certainty);
      }
      for (const child of result.children) {
        expect(child.certainty).toBe(parentEdge(family, item.id, child.id)?.certainty);
      }
    }
  });

  it("does not read the summary for kin", () => {
    const misleading: FamilyGraph = {
      people: family.people.map((item) => ({
        ...item,
        summary: "Hijo de Mercedes Viñas López. Hermano de Andrés Martín Ochoa Erena.",
      })),
      edges: family.edges,
      contexts: family.contexts,
    };
    for (const id of SNAPSHOT_IDS) {
      expect(fichaKin(misleading, id)).toEqual(fichaKin(family, id));
    }
    expect(ids(fichaKin(misleading, andres).siblings)).not.toContain(mercedes);
  });

  it("keeps every group empty when the graph has no edges", () => {
    const alone: FamilyGraph = { people: family.people, edges: [], contexts: [] };
    for (const item of family.people) {
      expect(fichaKin(alone, item.id)).toEqual(EMPTY);
    }
  });
});

describe("fichaKin on small graphs", () => {
  it("keeps the edge order and does not sort names", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("zoe", "Zoe Ascendiente"),
        person("ana", "Ana Ascendiente"),
        person("zulema", "Zulema Descendiente"),
        person("alba", "Alba Descendiente"),
        person("zacarias", "Zacarías Colateral"),
        person("abel", "Abel Colateral"),
      ],
      edges: [
        edge("parent", "zoe", "foco"),
        edge("parent", "ana", "foco"),
        edge("parent", "foco", "zulema"),
        edge("parent", "foco", "alba"),
        edge("sibling", "foco", "zacarias"),
        edge("sibling", "abel", "foco"),
      ],
    });
    const result = fichaKin(graph, foco);
    expect(result.parents.map((item) => item.displayName)).toEqual([
      "Zoe Ascendiente",
      "Ana Ascendiente",
    ]);
    expect(result.children.map((item) => item.displayName)).toEqual([
      "Zulema Descendiente",
      "Alba Descendiente",
    ]);
    expect(result.siblings.map((item) => item.displayName)).toEqual([
      "Zacarías Colateral",
      "Abel Colateral",
    ]);
    expect(ids(result.siblings)).toEqual(siblingsOf(graph, foco));
  });

  it("reads parent certainty from each parent edge", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("madre", "María Ascendiente 1"),
        person("hijo", "Pedro Descendiente 1"),
        person("hija", "María Descendiente 1"),
      ],
      edges: [
        edge("parent", "padre", "foco"),
        edge("parent", "madre", "foco", "hypothesis"),
        edge("parent", "foco", "hijo", "hypothesis"),
        edge("parent", "foco", "hija"),
      ],
    });
    const result = fichaKin(graph, foco);
    expect(result.parents).toEqual([
      kin(asPersonId("padre"), "Pedro Ascendiente 1"),
      kin(asPersonId("madre"), "María Ascendiente 1", "hypothesis"),
    ]);
    expect(result.children).toEqual([
      kin(asPersonId("hijo"), "Pedro Descendiente 1", "hypothesis"),
      kin(asPersonId("hija"), "María Descendiente 1"),
    ]);
  });

  it("reads sibling certainty from an explicit sibling edge in either direction", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("hermano", "Pedro Colateral 0"),
        person("hermana", "María Colateral 0"),
      ],
      edges: [
        edge("sibling", "foco", "hermano", "hypothesis"),
        edge("sibling", "hermana", "foco"),
      ],
    });
    expect(fichaKin(graph, foco).siblings).toEqual([
      kin(asPersonId("hermano"), "Pedro Colateral 0", "hypothesis"),
      kin(asPersonId("hermana"), "María Colateral 0"),
    ]);
  });

  it("marks an inferred sibling confirmed only when a confirmed parent is shared", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("madre", "María Ascendiente 1"),
        person("hermano-a", "Pedro Colateral A"),
        person("hermano-b", "Pedro Colateral B"),
        person("hermano-c", "Pedro Colateral C"),
      ],
      edges: [
        edge("parent", "padre", "foco"),
        edge("parent", "madre", "foco", "hypothesis"),
        edge("parent", "padre", "hermano-a"),
        edge("parent", "padre", "hermano-b", "hypothesis"),
        edge("parent", "madre", "hermano-c"),
      ],
    });
    const result = fichaKin(graph, foco);
    expect(ids(result.siblings)).toEqual(
      ["hermano-a", "hermano-b", "hermano-c"].map(asPersonId),
    );
    expect(certainties(result.siblings)).toEqual(["confirmed", "hypothesis", "hypothesis"]);
  });

  it("prefers the explicit sibling edge over the inferred parent path", () => {
    const doubted = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("hermano", "Pedro Colateral 0"),
      ],
      edges: [
        edge("parent", "padre", "foco"),
        edge("parent", "padre", "hermano"),
        edge("sibling", "foco", "hermano", "hypothesis"),
      ],
    });
    expect(fichaKin(doubted, foco).siblings).toEqual([
      kin(asPersonId("hermano"), "Pedro Colateral 0", "hypothesis"),
    ]);

    const vouched = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("padre", "Pedro Ascendiente 1"),
        person("hermano", "Pedro Colateral 0"),
      ],
      edges: [
        edge("parent", "padre", "foco"),
        edge("parent", "padre", "hermano", "hypothesis"),
        edge("sibling", "hermano", "foco"),
      ],
    });
    expect(fichaKin(vouched, foco).siblings).toEqual([
      kin(asPersonId("hermano"), "Pedro Colateral 0"),
    ]);
  });

  it("skips unknown ids and never invents people", () => {
    const { people } = parseFamily({
      people: [person("foco", FOCUS_NAME), person("padre", "Pedro Ascendiente 1")],
      edges: [],
    });
    const graph: FamilyGraph = {
      people,
      contexts: [],
      edges: [
        { kind: "parent", from: asPersonId("padre"), to: foco, certainty: "confirmed" },
        { kind: "parent", from: asPersonId("fantasma"), to: foco, certainty: "confirmed" },
        { kind: "parent", from: foco, to: asPersonId("fantasma-hijo"), certainty: "confirmed" },
        { kind: "sibling", from: foco, to: asPersonId("fantasma-hermano"), certainty: "confirmed" },
      ],
    };
    expect(fichaKin(graph, foco)).toEqual({
      parents: [kin(asPersonId("padre"), "Pedro Ascendiente 1")],
      children: [],
      siblings: [],
    });
  });

  it("returns empty arrays for a person with no kin edges", () => {
    const graph = parseFamily({
      people: [
        person("foco", FOCUS_NAME),
        person("conyuge", "María Consorte"),
        person("isla", "Pedro Isla"),
      ],
      edges: [edge("spouse", "foco", "conyuge")],
    });
    expect(fichaKin(graph, foco)).toEqual(EMPTY);
    expect(fichaKin(graph, asPersonId("isla"))).toEqual(EMPTY);
  });
});

describe("ficha kin labels", () => {
  it("names the groups Padres, Hijos, and Hermanos", () => {
    expect(FICHA_KIN_LABELS).toEqual({
      parents: "Padres",
      children: "Hijos",
      siblings: "Hermanos",
    });
  });

  it("has one label for each kin group", () => {
    expect(Object.keys(FICHA_KIN_LABELS).sort()).toEqual(
      Object.keys(fichaKin(family, andres)).sort(),
    );
  });

  it("marks hypothesis kin with the same word as the leyenda and the grado", () => {
    expect(FICHA_KIN_HYPOTHESIS).toBe("hipótesis");
    expect(LEGEND_ITEMS.find((item) => item.id === "line-dashed")?.label).toBe(
      FICHA_KIN_HYPOTHESIS,
    );
  });
});
