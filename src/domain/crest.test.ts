import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { CREST_CLUSTER_GAP, ochoaCrest, placeCrestAboveCluster } from "@/domain/crest";
import { pinExpandedLayout } from "@/domain/expand-motion";
import { layoutPedigree } from "@/domain/layout";
import {
  asPersonId,
  type PedigreeLayout,
  type PersonId,
  type PlacedNode,
} from "@/domain/types";

const ANDRES = asPersonId("andres-martin-ochoa-erena");
const JAVIER = asPersonId("francisco-javier-ochoa-palop");
const AURORA_ERENA = asPersonId("maria-aurora-erena-camacho");

function nodeById(layout: PedigreeLayout, id: PersonId): PlacedNode {
  const node = layout.nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error(`Missing node ${id}`);
  }
  return node;
}

function clusterCloserTo(
  layout: PedigreeLayout,
  seed: PersonId,
  other: PersonId,
): PlacedNode[] {
  const seedNode = nodeById(layout, seed);
  const otherNode = nodeById(layout, other);
  const seedX = seedNode.x + seedNode.width / 2;
  const otherX = otherNode.x + otherNode.width / 2;
  return layout.nodes.filter((node) => {
    const cx = node.x + node.width / 2;
    return Math.abs(cx - seedX) <= Math.abs(cx - otherX);
  });
}

function bbox(nodes: readonly PlacedNode[]): {
  minX: number;
  maxX: number;
  minY: number;
} {
  return {
    minX: Math.min(...nodes.map((node) => node.x)),
    maxX: Math.max(...nodes.map((node) => node.x + node.width)),
    minY: Math.min(...nodes.map((node) => node.y)),
  };
}

describe("ochoaCrest", () => {
  it("names the original asset in ES Spain", () => {
    expect(ochoaCrest.src).toBe("/escudo/ochoa-escudo.png");
    expect(ochoaCrest.alt).toBe("Escudo de Ochoa");
    expect(ochoaCrest.width).toBe(200);
    expect(ochoaCrest.height).toBe(300);
  });

  it("triples the gap above the cluster", () => {
    expect(CREST_CLUSTER_GAP).toBe(72);
  });

  it("places the crest farther above the top row", () => {
    const crest = placeCrestAboveCluster(
      [{ id: ANDRES, x: 0, y: 0, width: 120, height: 38, generation: 0 }],
      { id: "ochoa", width: ochoaCrest.width, height: ochoaCrest.height },
    );
    expect(crest).not.toBeNull();
    expect(crest?.width).toBe(200);
    expect(crest?.height).toBe(300);
    expect(crest?.y).toBe(-CREST_CLUSTER_GAP - ochoaCrest.height);
    expect(0 - (crest!.y + crest!.height)).toBe(72);
  });
});

describe("branch crest", () => {
  it("sits above the Ochoa cluster when Andrés is focus", () => {
    const layout = layoutPedigree(family, ANDRES, []);
    expect(layout.crests).toHaveLength(1);
    const crest = layout.crests[0];
    expect(crest.id).toBe("ochoa");
    expect(crest.width).toBe(200);
    expect(crest.height).toBe(300);
    const javier = nodeById(layout, JAVIER);
    const aurora = nodeById(layout, AURORA_ERENA);
    expect(javier.x + javier.width).toBeLessThan(aurora.x);
    const cluster = clusterCloserTo(layout, JAVIER, AURORA_ERENA);
    expect(cluster.some((node) => node.id === JAVIER)).toBe(true);
    expect(cluster.some((node) => node.id === AURORA_ERENA)).toBe(false);
    const box = bbox(cluster);
    expect(box.minY - (crest.y + crest.height)).toBe(CREST_CLUSTER_GAP);
    expect(crest.x + crest.width / 2).toBeCloseTo((box.minX + box.maxX) / 2, 5);
  });

  it("omits the crest on an Erena-only focus", () => {
    const layout = layoutPedigree(family, AURORA_ERENA, []);
    expect(layout.crests).toEqual([]);
  });

  it("sits above the house when Javier is focus", () => {
    const layout = layoutPedigree(family, JAVIER, []);
    expect(layout.crests).toHaveLength(1);
    const crest = layout.crests[0];
    expect(crest.id).toBe("ochoa");
    const box = bbox(layout.nodes);
    expect(box.minY - (crest.y + crest.height)).toBe(CREST_CLUSTER_GAP);
    expect(crest.x + crest.width / 2).toBeCloseTo((box.minX + box.maxX) / 2, 5);
  });

  it("keeps the crest pinned with Javier after a lane opens", () => {
    const closed = layoutPedigree(family, ANDRES, []);
    const opened = layoutPedigree(family, ANDRES, [JAVIER]);
    const pinned = pinExpandedLayout(closed, opened, JAVIER);
    const openedJavier = nodeById(opened, JAVIER);
    const pinnedJavier = nodeById(pinned, JAVIER);
    const dx = pinnedJavier.x - openedJavier.x;
    const dy = pinnedJavier.y - openedJavier.y;
    expect(pinned.crests).toHaveLength(1);
    expect(opened.crests).toHaveLength(1);
    expect(pinned.crests[0].x).toBe(opened.crests[0].x + dx);
    expect(pinned.crests[0].y).toBe(opened.crests[0].y + dy);
  });
});
