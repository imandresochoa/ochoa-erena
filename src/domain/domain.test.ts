import { describe, expect, it } from "vitest";
import { parseFamily } from "@/domain/parse";
import { foldAccents, findExactName, suggestPeople } from "@/domain/search";
import { LEGEND_ITEMS } from "@/domain/legend";
import { hasExpandableSiblings, siblingsOf, visiblePeople } from "@/domain/graph";
import { family } from "@/data/family";
import { pinExpandedLayout, plusOrigin } from "@/domain/expand-motion";
import { layoutPedigree, measureNodeWidth } from "@/domain/layout";
import {
  asPersonId,
  DEFAULT_FOCUS_NAME,
  NODE_HEIGHT,
  ROW_GAP,
} from "@/domain/types";
import { classifyPointer, isRestored, needsRestaurar, restorePan } from "@/domain/view";
import { WELCOME_INTRODUCTION } from "@/domain/welcome";

const fixture = parseFamily({
  people: [
    {
      id: "andres",
      displayName: "Andrés Martín Ochoa Erena",
      marks: ["TO"],
      summary: "Jaén.",
    },
    {
      id: "francisco",
      displayName: "Francisco Javier Ochoa Palop",
      marks: ["TO", "H"],
      summary: "Padre.",
    },
    {
      id: "aurora",
      displayName: "María Aurora Erena Camacho",
      marks: ["TO"],
      summary: "Madre.",
    },
    {
      id: "matilde",
      displayName: "Matilde Ochoa Palop",
      marks: ["TO", "H"],
      summary: "Tía paterna.",
    },
    {
      id: "jose",
      displayName: "José Ochoa Hidalgo",
      marks: ["TO", "C"],
      summary: "De la familia.",
    },
    {
      id: "martin",
      displayName: "Martín Ochoa Hidalgo",
      marks: ["TO", "H"],
      summary: "Abuelo.",
    },
  ],
  edges: [
    { kind: "parent", from: "francisco", to: "andres", certainty: "confirmed" },
    { kind: "parent", from: "aurora", to: "andres", certainty: "confirmed" },
    { kind: "parent", from: "martin", to: "francisco", certainty: "confirmed" },
    { kind: "spouse", from: "francisco", to: "aurora", certainty: "confirmed" },
    { kind: "sibling", from: "francisco", to: "matilde", certainty: "confirmed" },
    { kind: "sibling", from: "martin", to: "jose", certainty: "hypothesis" },
  ],
});

describe("search", () => {
  it("folds accents so andres matches Andrés", () => {
    expect(foldAccents("Andrés Martín")).toBe("andres martin");
    const hits = suggestPeople(fixture.people, "andres");
    expect(hits.map((person) => person.id)).toContain("andres");
  });

  it("finds the default full name", () => {
    const match = findExactName(fixture.people, DEFAULT_FOCUS_NAME);
    expect(match?.id).toBe("andres");
  });

  it("returns nothing for an unknown name", () => {
    expect(findExactName(fixture.people, "Nadie Inventado")).toBeUndefined();
    expect(suggestPeople(fixture.people, "zzzz")).toEqual([]);
  });
});

describe("graph", () => {
  it("keeps hypothesis sibling edges distinct from confirmed parent edges", () => {
    const hypo = fixture.edges.find((edge) => edge.to === "jose" || edge.from === "jose");
    expect(hypo?.certainty).toBe("hypothesis");
    const parent = fixture.edges.find((edge) => edge.to === "andres");
    expect(parent?.certainty).toBe("confirmed");
  });

  it("hides siblings until plus expands them", () => {
    const collapsed = visiblePeople(fixture, asPersonId("andres"), []);
    expect(collapsed.has(asPersonId("matilde"))).toBe(false);
    const opened = visiblePeople(fixture, asPersonId("andres"), [asPersonId("francisco")]);
    expect(opened.has(asPersonId("matilde"))).toBe(true);
    expect(hasExpandableSiblings(fixture, asPersonId("francisco"), [])).toBe(true);
    expect(siblingsOf(fixture, asPersonId("andres"))).toEqual([]);
  });
});

describe("layout", () => {
  it("places the focus as the origin and parents above", () => {
    const layout = layoutPedigree(fixture, asPersonId("andres"), []);
    const andres = layout.nodes.find((node) => node.id === "andres");
    const francisco = layout.nodes.find((node) => node.id === "francisco");
    expect(andres).toBeDefined();
    expect(francisco).toBeDefined();
    expect(andres?.generation).toBe(0);
    expect(francisco?.generation).toBe(-1);
    expect(francisco!.y).toBe(andres!.y - ROW_GAP);
    expect(layout.nodes.some((node) => node.id === "matilde")).toBe(false);
  });

  it("plus adds siblings and restaurar removes them", () => {
    const expanded = layoutPedigree(fixture, asPersonId("andres"), [
      asPersonId("francisco"),
    ]);
    expect(expanded.nodes.some((node) => node.id === "matilde")).toBe(true);
    const restored = layoutPedigree(fixture, asPersonId("andres"), []);
    expect(restored.nodes.some((node) => node.id === "matilde")).toBe(false);
  });

  it("marks hypothesis connectors", () => {
    const layout = layoutPedigree(fixture, asPersonId("martin"), [
      asPersonId("martin"),
    ]);
    expect(layout.connectors.some((item) => item.certainty === "hypothesis")).toBe(
      true,
    );
  });

  it("matches Figma node width for the default name", () => {
    expect(measureNodeWidth(DEFAULT_FOCUS_NAME)).toBe(240);
  });
});

describe("expand motion", () => {
  const andres = asPersonId("andres-martin-ochoa-erena");
  const francisco = asPersonId("francisco-javier-ochoa-palop");
  const matilde = asPersonId("matilde-ochoa-palop");

  it("pins Francisco at the closed plus after his lane opens", () => {
    const closed = layoutPedigree(family, andres, []);
    const opened = layoutPedigree(family, andres, [francisco]);
    const pinned = pinExpandedLayout(closed, opened, francisco);
    const closedFrancisco = closed.nodes.find((node) => node.id === francisco);
    const pinnedFrancisco = pinned.nodes.find((node) => node.id === francisco);
    expect(closedFrancisco).toBeDefined();
    expect(pinnedFrancisco).toBeDefined();
    expect(pinnedFrancisco?.x).toBe(closedFrancisco?.x);
    expect(pinnedFrancisco?.y).toBe(closedFrancisco?.y);
    expect(pinned.nodes.some((node) => node.id === matilde)).toBe(true);
  });

  it("puts Matilde enter origin on Francisco plus", () => {
    const closed = layoutPedigree(family, andres, []);
    const opened = layoutPedigree(family, andres, [francisco]);
    const pinned = pinExpandedLayout(closed, opened, francisco);
    const node = pinned.nodes.find((item) => item.id === francisco);
    expect(node).toBeDefined();
    expect(plusOrigin(node!)).toEqual({
      x: node!.x,
      y: node!.y + NODE_HEIGHT / 2,
    });
    const closedFrancisco = closed.nodes.find((item) => item.id === francisco);
    expect(plusOrigin(node!)).toEqual({
      x: closedFrancisco!.x,
      y: closedFrancisco!.y + NODE_HEIGHT / 2,
    });
  });
});

describe("view", () => {
  it("treats a move under 8px as a tap", () => {
    expect(classifyPointer({ x: 3, y: 4 })).toBe("tap");
    expect(classifyPointer({ x: 8, y: 0 })).toBe("pan");
  });

  it("restaurar zeros pan and expansions", () => {
    expect(isRestored([], { x: 0, y: 0 })).toBe(true);
    expect(isRestored(["francisco"], { x: 0, y: 0 })).toBe(false);
    expect(restorePan()).toEqual({ x: 0, y: 0 });
  });

  it("shows restaurar only after a plus expand", () => {
    expect(needsRestaurar([])).toBe(false);
    expect(needsRestaurar(["francisco"])).toBe(true);
  });
});

describe("legend", () => {
  it("lists the five canvas styles", () => {
    expect(LEGEND_ITEMS.map((item) => item.id)).toEqual([
      "node-idle",
      "node-hover",
      "node-selected",
      "line-solid",
      "line-dashed",
    ]);
  });
});

describe("welcome", () => {
  it("keeps the house introduction", () => {
    expect(WELCOME_INTRODUCTION).toBe(
      "Las raíces de la familia Ochoa Erena se remontan a dos tierras: Álava, en el norte, y la campiña jiennense. La rama Ochoa nace en el solar de Eguiyara, entre Aspárrena y Vitoria —de donde Martín María Ochoa de Eguiyara Antia bajó a Posadas a principios del siglo XX—, y se afirma después en Jaén. La rama Erena hunde sus orígenes en Torredonjimeno y Martos, donde Antonio Erena Liébana y Dolores López Martos asentaron la línea que, unida a la Ochoa, da nombre a esta casa.",
    );
  });
});
