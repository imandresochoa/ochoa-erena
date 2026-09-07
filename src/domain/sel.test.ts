import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { pinExpandedLayout } from "@/domain/expand-motion";
import { parentsOf } from "@/domain/graph";
import { layoutHouseCanvas, layoutPedigree } from "@/domain/layout";
import {
  SEL_BREAK_GAP,
  SEL_ID,
  SEL_LEAD_EMPHASIS,
  SEL_SUMMARY,
  contextById,
  placeSelNode,
  selContext,
  selImage,
} from "@/domain/sel";
import { NODE_HEIGHT, asPersonId, DEFAULT_FOCUS_ID } from "@/domain/types";

const MARTIN_MARIA = asPersonId("martin-maria-ochoa-de-eguiyara-antia");
const JUAN_JOSE = asPersonId("juan-jose-ochoa-de-eguiara");
const MARIA_CONCEPCION = asPersonId("maria-concepcion-antia-saez");
const ANDRES = asPersonId("andres-martin-ochoa-erena");
const JAVIER = asPersonId("francisco-javier-ochoa-palop");

describe("sel constants and data", () => {
  it("locks the copy, the emphasis, and the single sel context", () => {
    expect(SEL_ID).toBe("sel-de-egiara");
    expect(SEL_LEAD_EMPHASIS).toBe("sel de Egiara");
    expect(SEL_SUMMARY).toBe(
      "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el sel de Egiara.",
    );
    expect(SEL_SUMMARY).toContain(SEL_LEAD_EMPHASIS);
    expect(family.contexts.map((item) => item.id)).toEqual([SEL_ID]);
    expect(selContext(family)?.displayName).toBe("Sel de Egiara");
    expect(contextById(family, SEL_ID)?.summary).toBe(SEL_SUMMARY);
  });

  it("anchors the sel on Martín María, not on a s.XV person or a parent edge", () => {
    expect(selContext(family)?.anchors).toEqual([MARTIN_MARIA]);
    expect(family.people.some((person) => person.id === SEL_ID)).toBe(false);
    expect(
      family.edges.some(
        (edge) => edge.from === SEL_ID || edge.to === SEL_ID,
      ),
    ).toBe(false);
  });

  it("exposes a caserío image asset for the sel node", () => {
    expect(selImage.src).toBe("/sel/egiara-caserio.png");
    expect(selImage.alt).toMatch(/caser[ií]o/i);
    expect(selImage.width).toBeGreaterThan(0);
    expect(selImage.height).toBeGreaterThan(0);
  });
});

describe("placeSelNode", () => {
  it("returns nothing when the anchor is not on the canvas", () => {
    expect(placeSelNode(family, [])).toEqual([]);
    expect(
      placeSelNode(family, [
        { id: ANDRES, x: 0, y: 0, width: 80, height: 38, generation: 0 },
      ]),
    ).toEqual([]);
  });

  it("places a single node centered on Martín María, between him and his parents", () => {
    const nodes = [
      { id: JUAN_JOSE, x: 100, y: -148, width: 180, height: 38, generation: -1 },
      {
        id: MARIA_CONCEPCION,
        x: 320,
        y: -148,
        width: 160,
        height: 38,
        generation: -1,
      },
      { id: MARTIN_MARIA, x: 180, y: 0, width: 220, height: 38, generation: 0 },
    ];
    const placed = placeSelNode(family, nodes);
    expect(placed).toHaveLength(1);
    const sel = placed[0]!;
    expect(sel.id).toBe(SEL_ID);
    const martin = nodes[2];
    expect(sel.x + sel.width / 2).toBeCloseTo(martin.x + martin.width / 2, 0);
    const parentBottom = -148 + 38;
    expect(sel.y).toBeGreaterThan(parentBottom);
    expect(sel.y + sel.height).toBeLessThanOrEqual(martin.y);
    expect(sel.height).toBe(NODE_HEIGHT);
    expect(sel.width).toBeGreaterThan(0);
  });
});

describe("house canvas sel node", () => {
  it("places the sel as a single node without fog, people, or parent connectors", () => {
    const layout = layoutHouseCanvas(family, DEFAULT_FOCUS_ID, []);
    const pedigree = layoutPedigree(family, DEFAULT_FOCUS_ID, []);
    expect(layout).not.toHaveProperty("neblina");
    expect(layout.contextNodes).toHaveLength(1);
    const sel = layout.contextNodes[0]!;
    expect(sel.id).toBe(SEL_ID);
    const martin = layout.nodes.find((node) => node.id === MARTIN_MARIA);
    const parents = parentsOf(family, MARTIN_MARIA)
      .map((id) => layout.nodes.find((node) => node.id === id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
    expect(martin).toBeDefined();
    expect(parents.length).toBeGreaterThan(0);
    const parentBottom = Math.max(...parents.map((node) => node.y + node.height));
    expect(sel.x + sel.width / 2).toBeCloseTo(martin!.x + martin!.width / 2, 0);
    expect(sel.y).toBeGreaterThan(parentBottom);
    expect(sel.y + sel.height).toBeLessThanOrEqual(martin!.y);
    expect(layout.nodes.some((node) => node.id === SEL_ID)).toBe(false);
    expect(
      layout.connectors.some(
        (item) => item.fromId === SEL_ID || item.toId === SEL_ID,
      ),
    ).toBe(false);
    expect(pedigree.contextNodes).toEqual(layout.contextNodes);
  });

  it("opens a larger break above the caserío than below it", () => {
    const layout = layoutHouseCanvas(family, DEFAULT_FOCUS_ID, []);
    const sel = layout.contextNodes[0]!;
    const martin = layout.nodes.find((node) => node.id === MARTIN_MARIA)!;
    const parents = parentsOf(family, MARTIN_MARIA)
      .map((id) => layout.nodes.find((node) => node.id === id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
    const parentBottom = Math.max(...parents.map((node) => node.y + node.height));
    const gapAbove = sel.y - parentBottom;
    const gapBelow = martin.y - (sel.y + sel.height);
    expect(gapAbove).toBeGreaterThan(gapBelow);
  });

  it("lifts only the Basque branch by SEL_BREAK_GAP, leaving the maternal side put", () => {
    const layout = layoutHouseCanvas(family, DEFAULT_FOCUS_ID, []);
    const byId = new Map(layout.nodes.map((node) => [node.id, node]));
    const parentGap = (id: ReturnType<typeof asPersonId>) => {
      const child = byId.get(id)!;
      const parents = parentsOf(family, id)
        .map((pid) => byId.get(pid))
        .filter((node): node is NonNullable<typeof node> => Boolean(node));
      const parentBottom = Math.max(...parents.map((node) => node.y + node.height));
      return child.y - parentBottom;
    };
    const basqueGap = parentGap(MARTIN_MARIA);
    const maternalGap = parentGap(ANDRES);
    expect(basqueGap - maternalGap).toBe(SEL_BREAK_GAP);
  });

  it("shifts the sel node with the expand pin the same way as the crest", () => {
    const closed = layoutPedigree(family, ANDRES, []);
    const opened = layoutPedigree(family, ANDRES, [JAVIER]);
    const pinned = pinExpandedLayout(closed, opened, JAVIER);
    const openedJavier = opened.nodes.find((node) => node.id === JAVIER);
    const pinnedJavier = pinned.nodes.find((node) => node.id === JAVIER);
    expect(opened.contextNodes).toHaveLength(1);
    expect(pinned.contextNodes).toHaveLength(1);
    expect(openedJavier).toBeDefined();
    expect(pinnedJavier).toBeDefined();
    const dx = pinnedJavier!.x - openedJavier!.x;
    const dy = pinnedJavier!.y - openedJavier!.y;
    expect(pinned.contextNodes[0]!.x).toBe(opened.contextNodes[0]!.x + dx);
    expect(pinned.contextNodes[0]!.y).toBe(opened.contextNodes[0]!.y + dy);
  });
});
