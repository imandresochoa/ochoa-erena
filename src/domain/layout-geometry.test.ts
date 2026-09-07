import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { parentsOf } from "@/domain/graph";
import { layoutHouseCanvas, layoutPedigree } from "@/domain/layout";
import {
  asPersonId,
  BRANCH_GUTTER,
  PAIR_GAP,
  SIBLING_GAP,
  type Connector,
  type PedigreeLayout,
  type PersonId,
  type PlacedNode,
} from "@/domain/types";

const ANDRES = asPersonId("andres-martin-ochoa-erena");
const JAVIER = asPersonId("francisco-javier-ochoa-palop");
const AURORA_ERENA = asPersonId("maria-aurora-erena-camacho");
const AURORA_CAMACHO = asPersonId("aurora-camacho-vinas");
const ANTONIO_CAMACHO = asPersonId("antonio-camacho-liebana");
const MERCEDES_VINAS = asPersonId("mercedes-vinas-lopez");
const MERCEDES = asPersonId("mercedes-ochoa-erena");
const DARIO = asPersonId("dario-de-dios-ochoa");

function nodeById(layout: PedigreeLayout, id: PersonId): PlacedNode {
  const node = layout.nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error(`Missing node ${id}`);
  }
  return node;
}

function nodeCenter(node: PlacedNode): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function pathPoints(d: string): { x: number; y: number }[] {
  const tokens = d.trim().split(/[\s,]+/).filter(Boolean);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "M" || token === "L") {
      const x = Number(tokens[i + 1]);
      const y = Number(tokens[i + 2]);
      points.push({ x, y });
      i += 2;
    }
  }
  return points;
}

function connectorFor(
  layout: PedigreeLayout,
  from: PersonId,
  to: PersonId,
): Connector {
  const named = layout.connectors.find(
    (item) => item.fromId === from && item.toId === to,
  );
  if (named) {
    return named;
  }
  throw new Error(`Missing connector ${from} -> ${to}`);
}

function expectPoint(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
}

describe("layout geometry", () => {
  it("starts every parent lane at the parent center and ends at the child center", () => {
    const layout = layoutPedigree(family, ANDRES, []);
    const placed = new Set(layout.nodes.map((node) => node.id));
    const parentEdges = family.edges.filter(
      (edge) =>
        edge.kind === "parent" && placed.has(edge.from) && placed.has(edge.to),
    );
    expect(parentEdges.length).toBeGreaterThan(0);
    for (const edge of parentEdges) {
      const parent = nodeById(layout, edge.from);
      const child = nodeById(layout, edge.to);
      const connector = connectorFor(layout, edge.from, edge.to);
      const points = pathPoints(connector.d);
      expect(points.length).toBeGreaterThanOrEqual(2);
      const oneParent =
        parentsOf(family, edge.to).filter((id) => placed.has(id)).length === 1;
      if (oneParent) {
        expectPoint(points[0], {
          x: parent.x + parent.width / 2,
          y: parent.y + parent.height,
        });
        expectPoint(points[points.length - 1], {
          x: child.x + child.width / 2,
          y: child.y,
        });
        continue;
      }
      expectPoint(points[0], nodeCenter(parent));
      expectPoint(points[points.length - 1], nodeCenter(child));
    }
  });

  it("connects both parents of Aurora Camacho Viñas to her center", () => {
    const layout = layoutPedigree(family, ANDRES, []);
    const child = nodeById(layout, AURORA_CAMACHO);
    for (const parentId of [ANTONIO_CAMACHO, MERCEDES_VINAS]) {
      const parent = nodeById(layout, parentId);
      const connector = connectorFor(layout, parentId, AURORA_CAMACHO);
      const points = pathPoints(connector.d);
      expectPoint(points[0], nodeCenter(parent));
      expectPoint(points[points.length - 1], nodeCenter(child));
    }
  });

  it("keeps a branch gutter between Javier Ochoa Palop and Aurora Erena Camacho", () => {
    const layout = layoutPedigree(family, ANDRES, []);
    const javier = nodeById(layout, JAVIER);
    const aurora = nodeById(layout, AURORA_ERENA);
    const left = javier.x <= aurora.x ? javier : aurora;
    const right = javier.x <= aurora.x ? aurora : javier;
    const gap = right.x - (left.x + left.width);
    expect(gap).toBeGreaterThanOrEqual(BRANCH_GUTTER);
  });
});

const MANUEL_MARTINEZ = asPersonId("manuel-martinez-de-albeniz-albizu");
const PHELIPA = asPersonId("phelipa-zufiaur-ybarreta");
const BARBARA = asPersonId("barbara-martinez-de-albeniz");
const MANUEL_ANTIA = asPersonId("manuel-antia-ruiz-de-eguino");
const FRANCISCO_ANTIA = asPersonId("francisco-antia-zubicain");
const VICENTA = asPersonId("vicenta-ruiz-de-eguino");
const MATILDE = asPersonId("matilde-ochoa-palop");
const JOSE = asPersonId("jose-ochoa-hidalgo");
const MARTIN = asPersonId("martin-ochoa-hidalgo");
const JOAQUIN = asPersonId("joaquin-antia");
const JOSEFA = asPersonId("josefa-saez-de-eguilaz");

function unitCenter(layout: PedigreeLayout, ids: PersonId[]): number {
  const nodes = ids.map((id) => nodeById(layout, id));
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  return (minX + maxX) / 2;
}

function gapBetween(a: PlacedNode, b: PlacedNode): number {
  const left = a.x <= b.x ? a : b;
  const right = a.x <= b.x ? b : a;
  return right.x - (left.x + left.width);
}

describe("layout symmetry", () => {
  it("centers Manuel × Phelipa on Bárbara, not left of her", () => {
    const layout = layoutPedigree(family, ANDRES, []);
    const manuel = nodeById(layout, MANUEL_MARTINEZ);
    const phelipa = nodeById(layout, PHELIPA);
    const left = manuel.x <= phelipa.x ? manuel : phelipa;
    const right = manuel.x <= phelipa.x ? phelipa : manuel;
    const child = nodeCenter(nodeById(layout, BARBARA)).x;
    expect((left.x + right.x + right.width) / 2).toBeCloseTo(child, 5);
    expect((left.x + left.width + right.x) / 2).toBeCloseTo(child, 5);
  });

  it("centers Manuel × Phelipa on Bárbara when she is the focus", () => {
    const layout = layoutPedigree(family, BARBARA, []);
    const manuel = nodeById(layout, MANUEL_MARTINEZ);
    const phelipa = nodeById(layout, PHELIPA);
    const barbara = nodeById(layout, BARBARA);
    const left = manuel.x <= phelipa.x ? manuel : phelipa;
    const right = manuel.x <= phelipa.x ? phelipa : manuel;
    const boundsCenter = (left.x + right.x + right.width) / 2;
    const barMid = (left.x + left.width + right.x) / 2;
    const child = barbara.x + barbara.width / 2;
    expect(boundsCenter).toBe(child);
    expect(barMid).toBe(child);
    expect(gapBetween(manuel, phelipa)).toBe(PAIR_GAP);
    for (let i = 0; i < layout.nodes.length; i += 1) {
      for (let j = i + 1; j < layout.nodes.length; j += 1) {
        const a = layout.nodes[i];
        const b = layout.nodes[j];
        const hit = !(
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y
        );
        expect(hit, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it("centers Francisco × Vicenta on Manuel Antia", () => {
    const layout = layoutPedigree(family, ANDRES, []);
    const couple = unitCenter(layout, [FRANCISCO_ANTIA, VICENTA]);
    const child = nodeCenter(nodeById(layout, MANUEL_ANTIA));
    expect(couple).toBeCloseTo(child.x, 0);
  });

  it("keeps the two in-law couples from overlapping", () => {
    const layout = layoutPedigree(family, ANDRES, []);
    const left = [nodeById(layout, FRANCISCO_ANTIA), nodeById(layout, VICENTA)];
    const right = [nodeById(layout, MANUEL_MARTINEZ), nodeById(layout, PHELIPA)];
    const leftRight = Math.max(...left.map((node) => node.x + node.width));
    const rightLeft = Math.min(...right.map((node) => node.x));
    expect(rightLeft - leftRight).toBeGreaterThanOrEqual(SIBLING_GAP);
  });

  it("does not overlap person cards", () => {
    const layout = layoutPedigree(family, ANDRES, [JAVIER]);
    for (let i = 0; i < layout.nodes.length; i += 1) {
      for (let j = i + 1; j < layout.nodes.length; j += 1) {
        const a = layout.nodes[i];
        const b = layout.nodes[j];
        const hit = !(
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y
        );
        expect(hit, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it("keeps spouses closer than siblings and does not draw them as siblings", () => {
    expect(PAIR_GAP).toBeLessThan(SIBLING_GAP);
    const layout = layoutPedigree(family, ANDRES, [JAVIER]);
    const joaquin = nodeById(layout, JOAQUIN);
    const josefa = nodeById(layout, JOSEFA);
    const francisco = nodeById(layout, JAVIER);
    const matilde = nodeById(layout, MATILDE);
    expect(gapBetween(joaquin, josefa)).toBe(PAIR_GAP);
    expect(gapBetween(francisco, matilde)).toBeGreaterThanOrEqual(SIBLING_GAP);
    expect(gapBetween(francisco, matilde)).toBeGreaterThan(gapBetween(joaquin, josefa));
    const spouse = layout.connectors.find(
      (item) =>
        item.kind === "spouse" &&
        ((item.fromId === BARBARA && item.toId === MANUEL_ANTIA) ||
          (item.fromId === MANUEL_ANTIA && item.toId === BARBARA)),
    );
    const falseSibling = layout.connectors.find(
      (item) =>
        item.kind === "spouse" &&
        ((item.fromId === JAVIER && item.toId === MATILDE) ||
          (item.fromId === MATILDE && item.toId === JAVIER)),
    );
    expect(spouse).toBeDefined();
    expect(falseSibling).toBeUndefined();
  });

  it("labels parent, spouse and isolated sibling edges in Spanish", () => {
    const layout = layoutPedigree(family, ANDRES, [MARTIN]);
    expect(connectorFor(layout, PHELIPA, BARBARA).label).toBe("madre · hija");
    expect(connectorFor(layout, MANUEL_MARTINEZ, BARBARA).label).toBe("padre · hija");
    const spouse = layout.connectors.find(
      (item) =>
        item.kind === "spouse" &&
        ((item.fromId === MANUEL_MARTINEZ && item.toId === PHELIPA) ||
          (item.fromId === PHELIPA && item.toId === MANUEL_MARTINEZ)),
    );
    expect(spouse?.label).toBe("cónyuge");
    const jose = layout.connectors.find(
      (item) =>
        item.kind === "sibling" &&
        (item.fromId === JOSE || item.toId === JOSE),
    );
    expect(jose?.label).toBe("hermanos");
  });
});
