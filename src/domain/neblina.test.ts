import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { pinExpandedLayout } from "@/domain/expand-motion";
import { parentsOf } from "@/domain/graph";
import { layoutHouseCanvas, layoutPedigree } from "@/domain/layout";
import {
  NEBLINA_COPY,
  NEBLINA_LEAD_EMPHASIS,
  NEBLINA_LEGEND_ID,
  NEBLINA_LEGEND_LABEL,
  contextById,
  fogContexts,
  placeContextNodes,
  placeNeblina,
} from "@/domain/neblina";
import { asPersonId, DEFAULT_FOCUS_ID } from "@/domain/types";

const JUAN = asPersonId("juan-ochoa-de-eguiara");
const JUAN_JOSE = asPersonId("juan-jose-ochoa-de-eguiara");
const MARTIN_MARIA = asPersonId("martin-maria-ochoa-de-eguiyara-antia");
const ANDRES = asPersonId("andres-martin-ochoa-erena");
const AURORA = asPersonId("maria-aurora-erena-camacho");
const JAVIER = asPersonId("francisco-javier-ochoa-palop");
const SEL = "sel-de-egiara";

describe("neblina copy", () => {
  it("locks the España copy and the sel emphasis", () => {
    expect(NEBLINA_COPY).toBe(
      "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el sel de Egiara.",
    );
    expect(NEBLINA_LEAD_EMPHASIS).toBe("sel de Egiara");
    expect(NEBLINA_COPY).toContain(NEBLINA_LEAD_EMPHASIS);
  });

  it("names the leyenda sample without turning neblina into a line style", () => {
    expect(NEBLINA_LEGEND_ID).toBe("neblina");
    expect(NEBLINA_LEGEND_LABEL).toBe("neblina");
  });
});

describe("fog contexts", () => {
  it("reads the sel from data flags, not from a hardcoded person id", () => {
    const fog = fogContexts(family);
    expect(fog.map((item) => item.id)).toEqual([
      SEL,
      "manuel-antonio-ochoa-de-eguiara",
      "juan-jose-de-eguiara-y-eguren",
    ]);
    expect(fog[0]?.zone).toBe("fog");
    expect(fog[0]?.branch).toBe("lateral");
    expect(fog[0]?.anchors).toEqual([JUAN_JOSE, JUAN]);
    expect(contextById(family, SEL)?.displayName).toBe("Sel de Egiara");
  });

  it("does not treat people as the fog start and does not invent a s.XV parent", () => {
    expect(parentsOf(family, JUAN)).not.toContain(SEL);
    expect(family.people.some((person) => person.id === SEL)).toBe(false);
    expect(
      family.edges.some(
        (edge) =>
          edge.kind === "parent" && (edge.from === SEL || edge.to === SEL),
      ),
    ).toBe(false);
  });
});

describe("placeContextNodes", () => {
  it("returns nothing when no fog anchor is placed", () => {
    expect(placeContextNodes(family, [])).toEqual([]);
    expect(
      placeContextNodes(family, [
        { id: ANDRES, x: 0, y: 0, width: 80, height: 38, generation: 0 },
      ]),
    ).toEqual([]);
  });

  it("centers the lead sel on the tree and keeps extra mentions lateral", () => {
    const nodes = [
      { id: JUAN, x: 200, y: 80, width: 160, height: 38, generation: -6 },
      { id: JUAN_JOSE, x: 200, y: 228, width: 180, height: 38, generation: -5 },
      { id: ANDRES, x: 0, y: 800, width: 80, height: 38, generation: 0 },
    ];
    const placed = placeContextNodes(family, nodes);
    expect(placed.map((item) => item.id)).toEqual([
      SEL,
      "manuel-antonio-ochoa-de-eguiara",
      "juan-jose-de-eguiara-y-eguren",
    ]);
    const sel = placed[0]!;
    const extras = placed.slice(1);
    const treeMin = Math.min(...nodes.map((node) => node.x));
    const treeMax = Math.max(...nodes.map((node) => node.x + node.width));
    expect(sel.id).toBe(SEL);
    expect(sel.x + sel.width / 2).toBeCloseTo((treeMin + treeMax) / 2, 0);
    expect(sel.y + sel.height).toBeLessThanOrEqual(228);
    expect(sel.width).toBeGreaterThan(0);
    expect(sel.height).toBeGreaterThan(0);
    expect(extras.every((item) => item.x + item.width <= 200)).toBe(true);
    expect(placed.every((item) => item.y === sel.y)).toBe(true);
  });

  it("falls back to Juan when Juan José is not on the canvas", () => {
    const nodes = [
      { id: JUAN, x: 200, y: 80, width: 160, height: 38, generation: -6 },
      { id: ANDRES, x: 0, y: 800, width: 80, height: 38, generation: 0 },
    ];
    const placed = placeContextNodes(family, nodes);
    expect(placed).toHaveLength(3);
    expect(placed[0]!.y + placed[0]!.height).toBeLessThanOrEqual(80);
    expect(placed.slice(1).every((item) => item.x + item.width <= 200)).toBe(
      true,
    );
    expect(placed.every((item) => item.y === placed[0]!.y)).toBe(true);
  });

  it("places a later data mention beside the ancla without covering the sel", () => {
    const sel = family.contexts.find((item) => item.id === SEL);
    expect(sel).toBeDefined();
    const graph = {
      ...family,
      contexts: [
        sel!,
        {
          ...sel!,
          id: "mention-extra",
          displayName: "Mención extra",
        },
      ],
    };
    const nodes = [
      { id: JUAN_JOSE, x: 400, y: 228, width: 180, height: 38, generation: -5 },
    ];
    const placed = placeContextNodes(graph, nodes);
    expect(placed.map((item) => item.id)).toEqual([SEL, "mention-extra"]);
    const [first, second] = placed;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.y).toBe(second!.y);
    expect(first!.x + first!.width / 2).toBeCloseTo(490, 0);
    expect(second!.x + second!.width).toBeLessThanOrEqual(400);
    const overlap = !(
      first!.x + first!.width <= second!.x ||
      second!.x + second!.width <= first!.x ||
      first!.y + first!.height <= second!.y ||
      second!.y + second!.height <= first!.y
    );
    expect(overlap).toBe(false);
  });
});

describe("placeNeblina", () => {
  it("returns null when no context label is placed", () => {
    expect(placeNeblina([])).toBeNull();
    expect(placeNeblina([], [{ x: 0, width: 100 }])).toBeNull();
  });

  it("spans the tree as a thick mist band and does not emit a connector", () => {
    const labels = [{ id: SEL, x: 10, y: 80, width: 140, height: 38 }];
    const tree = [
      { x: -500, width: 100 },
      { x: 900, width: 120 },
    ];
    const zone = placeNeblina(labels, tree);
    expect(zone).not.toBeNull();
    expect(zone!.x).toBeLessThanOrEqual(-500);
    expect(zone!.x + zone!.width).toBeGreaterThanOrEqual(1020);
    expect(zone!.height).toBeGreaterThanOrEqual(160);
    expect(zone!.width).toBeGreaterThan(zone!.height * 6);
    expect(zone).not.toHaveProperty("d");
    expect(zone).not.toHaveProperty("fromId");
    expect(zone).not.toHaveProperty("toId");
  });
});

describe("house canvas neblina", () => {
  it("places a full-width fog band and a lateral sel without people or parent connectors", () => {
    const withAndres = layoutHouseCanvas(family, DEFAULT_FOCUS_ID, []);
    const withAurora = layoutHouseCanvas(family, AURORA, []);
    const pedigree = layoutPedigree(family, DEFAULT_FOCUS_ID, []);
    const sel = withAndres.contextNodes.find((node) => node.id === SEL);
    const extras = withAndres.contextNodes.filter((node) => node.id !== SEL);
    const juan = withAndres.nodes.find((node) => node.id === JUAN);
    const juanJose = withAndres.nodes.find((node) => node.id === JUAN_JOSE);
    const treeMin = Math.min(...withAndres.nodes.map((node) => node.x));
    const treeMax = Math.max(
      ...withAndres.nodes.map((node) => node.x + node.width),
    );
    expect(withAndres.nodes.some((node) => node.id === JUAN)).toBe(true);
    expect(withAndres.nodes.some((node) => node.id === SEL)).toBe(false);
    expect(sel).toBeDefined();
    expect(juan).toBeDefined();
    expect(juanJose).toBeDefined();
    expect(sel!.x + sel!.width / 2).toBeCloseTo((treeMin + treeMax) / 2, 0);
    expect(sel!.y + sel!.height).toBeLessThanOrEqual(juanJose!.y);
    expect(sel!.y).not.toBe(juan!.y);
    expect(extras.every((item) => item.x + item.width <= juanJose!.x)).toBe(
      true,
    );
    expect(withAndres.neblina).not.toBeNull();
    expect(withAurora.neblina).not.toBeNull();
    expect(withAndres.neblina!.x).toBeLessThanOrEqual(treeMin);
    expect(withAndres.neblina!.x + withAndres.neblina!.width).toBeGreaterThanOrEqual(
      treeMax,
    );
    expect(withAndres.neblina!.height).toBeGreaterThanOrEqual(160);
    expect(withAndres.neblina!.width).toBeGreaterThan(
      withAndres.neblina!.height * 6,
    );
    expect(pedigree.neblina).toEqual(withAndres.neblina);
    expect(pedigree.contextNodes).toEqual(withAndres.contextNodes);
    expect(withAndres.connectors).toHaveLength(pedigree.connectors.length);
    expect(
      withAndres.connectors.some(
        (item) =>
          item.fromId === SEL ||
          item.toId === SEL ||
          /1444|sendo|sel-de-egiara|siglo/i.test(
            `${item.fromId} ${item.toId} ${item.label}`,
          ),
      ),
    ).toBe(false);
    const hipIds = withAndres.nodes
      .filter((node) => node.id === MARTIN_MARIA || node.id === JUAN_JOSE)
      .map((node) => node.id);
    expect(hipIds.length).toBeGreaterThan(0);
  });

  it("shifts the zone and the sel label with the expand pin the same way as the crest", () => {
    const closed = layoutPedigree(family, ANDRES, []);
    const opened = layoutPedigree(family, ANDRES, [JAVIER]);
    const pinned = pinExpandedLayout(closed, opened, JAVIER);
    const openedJavier = opened.nodes.find((node) => node.id === JAVIER);
    const pinnedJavier = pinned.nodes.find((node) => node.id === JAVIER);
    expect(opened.neblina).not.toBeNull();
    expect(pinned.neblina).not.toBeNull();
    expect(opened.contextNodes).toHaveLength(3);
    expect(pinned.contextNodes).toHaveLength(3);
    expect(openedJavier).toBeDefined();
    expect(pinnedJavier).toBeDefined();
    const dx = pinnedJavier!.x - openedJavier!.x;
    const dy = pinnedJavier!.y - openedJavier!.y;
    expect(pinned.neblina!.x).toBe(opened.neblina!.x + dx);
    expect(pinned.neblina!.y).toBe(opened.neblina!.y + dy);
    expect(pinned.contextNodes[0]!.x).toBe(opened.contextNodes[0]!.x + dx);
    expect(pinned.contextNodes[0]!.y).toBe(opened.contextNodes[0]!.y + dy);
  });
});
