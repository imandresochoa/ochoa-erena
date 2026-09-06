import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { layoutPedigree } from "@/domain/layout";
import {
  asPersonId,
  BRANCH_GUTTER,
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
