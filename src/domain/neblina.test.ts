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
    expect(fog.map((item) => item.id)).toEqual([SEL]);
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

  it("sits to the left of the oldest visible Eguiara anchor, not above as a parent", () => {
    const placed = placeContextNodes(family, [
      { id: JUAN, x: 200, y: 80, width: 160, height: 38, generation: -6 },
      { id: JUAN_JOSE, x: 200, y: 228, width: 180, height: 38, generation: -5 },
      { id: ANDRES, x: 0, y: 800, width: 80, height: 38, generation: 0 },
    ]);
    expect(placed).toHaveLength(1);
    expect(placed[0]?.id).toBe(SEL);
    expect(placed[0]!.x + placed[0]!.width).toBeLessThanOrEqual(200);
    expect(placed[0]!.y).toBe(80);
    expect(placed[0]!.width).toBeGreaterThan(0);
    expect(placed[0]!.height).toBeGreaterThan(0);
  });
});

describe("placeNeblina", () => {
  it("returns null when no context chip is placed", () => {
    expect(placeNeblina([])).toBeNull();
  });

  it("wraps the sel chip and does not emit a connector", () => {
    const chips = [
      { id: SEL, x: 10, y: 80, width: 140, height: 38 },
    ];
    const zone = placeNeblina(chips);
    expect(zone).not.toBeNull();
    expect(zone!.x).toBeLessThanOrEqual(10);
    expect(zone!.y).toBeLessThanOrEqual(80);
    expect(zone!.x + zone!.width).toBeGreaterThanOrEqual(150);
    expect(zone!.y + zone!.height).toBeGreaterThanOrEqual(118);
    const midX = (zone!.x + zone!.x + zone!.width) / 2;
    const midY = (zone!.y + zone!.y + zone!.height) / 2;
    expect(midX).toBeCloseTo(80, 0);
    expect(midY).toBeCloseTo(99, 0);
    expect(zone).not.toHaveProperty("d");
    expect(zone).not.toHaveProperty("fromId");
    expect(zone).not.toHaveProperty("toId");
  });
});

describe("house canvas neblina", () => {
  it("places a lateral sel chip without adding people or parent connectors", () => {
    const withAndres = layoutHouseCanvas(family, DEFAULT_FOCUS_ID, []);
    const withAurora = layoutHouseCanvas(family, AURORA, []);
    const pedigree = layoutPedigree(family, DEFAULT_FOCUS_ID, []);
    const sel = withAndres.contextNodes.find((node) => node.id === SEL);
    const juan = withAndres.nodes.find((node) => node.id === JUAN);
    expect(withAndres.nodes.some((node) => node.id === JUAN)).toBe(true);
    expect(withAndres.nodes.some((node) => node.id === SEL)).toBe(false);
    expect(sel).toBeDefined();
    expect(juan).toBeDefined();
    expect(sel!.x + sel!.width).toBeLessThanOrEqual(juan!.x);
    expect(sel!.y).toBe(juan!.y);
    expect(withAndres.neblina).not.toBeNull();
    expect(withAurora.neblina).not.toBeNull();
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
    for (const node of withAndres.nodes) {
      const hit = !(
        withAndres.neblina!.x + withAndres.neblina!.width <= node.x ||
        node.x + node.width <= withAndres.neblina!.x ||
        withAndres.neblina!.y + withAndres.neblina!.height <= node.y ||
        node.y + node.height <= withAndres.neblina!.y
      );
      expect(hit, `neblina covers person ${node.id}`).toBe(false);
    }
  });

  it("shifts the zone and the sel chip with the expand pin the same way as the crest", () => {
    const closed = layoutPedigree(family, ANDRES, []);
    const opened = layoutPedigree(family, ANDRES, [JAVIER]);
    const pinned = pinExpandedLayout(closed, opened, JAVIER);
    const openedJavier = opened.nodes.find((node) => node.id === JAVIER);
    const pinnedJavier = pinned.nodes.find((node) => node.id === JAVIER);
    expect(opened.neblina).not.toBeNull();
    expect(pinned.neblina).not.toBeNull();
    expect(opened.contextNodes).toHaveLength(1);
    expect(pinned.contextNodes).toHaveLength(1);
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
