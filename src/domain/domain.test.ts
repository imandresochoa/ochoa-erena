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
import {
  classifyPointer,
  clampZoom,
  closeFicha,
  DEFAULT_ZOOM,
  fichaPersonAfterPointer,
  focusPerson,
  isRestored,
  needsRestaurar,
  openFicha,
  restorePan,
  stepZoom,
  wheelZoom,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  zoomPercentText,
} from "@/domain/view";
import { WELCOME_INTRODUCTION, WELCOME_TITLE } from "@/domain/welcome";

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

  it("opens the ficha when tapping a person", () => {
    const personId = asPersonId("andres");
    expect(fichaPersonAfterPointer(false, personId)).toBe(personId);
  });

  it("keeps the ficha closed after a pan", () => {
    expect(fichaPersonAfterPointer(true, asPersonId("andres"))).toBeNull();
  });

  it("keeps the ficha closed when tapping with no person", () => {
    expect(fichaPersonAfterPointer(false, null)).toBeNull();
  });
});

describe("focus", () => {
  const andres = asPersonId("andres");
  const francisco = asPersonId("francisco");
  const view = {
    focusId: andres,
    selectedId: andres,
    expandedIds: [francisco],
    pan: { x: 120, y: -40 },
    entering: true,
    zoom: 0.8,
  };

  it("focusing another person recenters, clears selection and expansions, and keeps zoom", () => {
    expect(focusPerson(view, francisco)).toEqual({
      focusId: francisco,
      selectedId: null,
      expandedIds: [],
      pan: { x: 0, y: 0 },
      entering: false,
      zoom: 0.8,
    });
  });

  it("focusing the same person keeps selection, expansions, and zoom but zeros pan", () => {
    expect(focusPerson(view, andres)).toEqual({
      focusId: andres,
      selectedId: andres,
      expandedIds: [francisco],
      pan: { x: 0, y: 0 },
      entering: false,
      zoom: 0.8,
    });
  });

  it("does not open a ficha when focusing from the chrome", () => {
    const closed = { ...view, selectedId: null };
    expect(focusPerson(closed, francisco).selectedId).toBeNull();
    expect(focusPerson(closed, andres).selectedId).toBeNull();
  });
});

describe("ficha", () => {
  const andres = asPersonId("andres");
  const francisco = asPersonId("francisco");
  const view = {
    focusId: andres,
    selectedId: andres,
    expandedIds: [francisco],
    pan: { x: 120, y: -40 },
    entering: true,
    zoom: 0.8,
  };

  it("opening another person only writes selectedId", () => {
    expect(openFicha(view, francisco)).toEqual({
      focusId: andres,
      selectedId: francisco,
      expandedIds: [francisco],
      pan: { x: 120, y: -40 },
      entering: true,
      zoom: 0.8,
    });
  });

  it("opening the focused person only writes selectedId", () => {
    const closed = { ...view, selectedId: null };
    expect(openFicha(closed, andres)).toEqual({
      focusId: andres,
      selectedId: andres,
      expandedIds: [francisco],
      pan: { x: 120, y: -40 },
      entering: true,
      zoom: 0.8,
    });
  });

  it("closing clears selectedId and keeps expand, focus, pan, and zoom", () => {
    expect(closeFicha(view)).toEqual({
      focusId: andres,
      selectedId: null,
      expandedIds: [francisco],
      pan: { x: 120, y: -40 },
      entering: true,
      zoom: 0.8,
    });
  });

  it("open then close returns to the same graph camera with selectedId null", () => {
    const opened = openFicha({ ...view, selectedId: null }, francisco);
    expect(closeFicha(opened)).toEqual({
      focusId: andres,
      selectedId: null,
      expandedIds: [francisco],
      pan: { x: 120, y: -40 },
      entering: true,
      zoom: 0.8,
    });
  });
});

describe("zoom", () => {
  it("exports default max min and step", () => {
    expect(DEFAULT_ZOOM).toBe(1);
    expect(ZOOM_MAX).toBe(1);
    expect(ZOOM_MIN).toBe(0.25);
    expect(ZOOM_STEP).toBe(0.1);
  });

  it("clamps zoom to the allowed range", () => {
    expect(clampZoom(2)).toBe(1);
    expect(clampZoom(0)).toBe(0.25);
    expect(clampZoom(0.5)).toBe(0.5);
  });

  it("steps zoom then clamps at the ends", () => {
    expect(stepZoom(1, 1)).toBe(1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(0.3, -1)).toBe(0.25);
  });

  it("wheel zooms out for positive deltaY and stays in range", () => {
    expect(wheelZoom(1, 120)).toBeLessThan(1);
    expect(wheelZoom(1, 120)).toBeGreaterThanOrEqual(0.25);
    expect(wheelZoom(1, -120)).toBe(1);
    expect(wheelZoom(0.25, 400)).toBe(0.25);
    expect(wheelZoom(0.5, 0)).toBe(0.5);
  });

  it("formats zoom as a percent", () => {
    expect(zoomPercentText(1)).toBe("100%");
    expect(zoomPercentText(0.9)).toBe("90%");
    expect(zoomPercentText(0.25)).toBe("25%");
    expect(zoomPercentText(0.333)).toBe("33%");
  });
});

describe("legend", () => {
  it("lists confirmed, hypothesis, and temporal gap vínculos", () => {
    expect(LEGEND_ITEMS).toEqual([
      { id: "line-solid", label: "vínculo confirmado" },
      { id: "line-dashed", label: "hipótesis" },
      { id: "line-dotted", label: "salto temporal" },
    ]);
  });
});


describe("welcome", () => {
  it("keeps the house introduction", () => {
    expect(WELCOME_INTRODUCTION).toBe(
      "Las raíces de la familia Ochoa Erena se remontan a dos tierras: Álava, en el norte, y la campiña jiennense. La rama Ochoa nace en el solar de Eguiyara, entre Aspárrena y Vitoria —de donde Martín María Ochoa de Eguiyara Antia bajó a Posadas a principios del siglo XX—, y se afirma después en Jaén. La rama Erena hunde sus orígenes en Torredonjimeno y Martos, donde Antonio Erena Liébana y Dolores López Martos asentaron la línea que, unida a la Ochoa, da nombre a esta casa.",
    );
  });

  it("names the house tree", () => {
    expect(WELCOME_TITLE).toBe("Árbol genealógico de la familia Ochoa Erena");
  });
});
