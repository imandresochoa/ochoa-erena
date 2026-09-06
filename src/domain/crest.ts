import type { PlacedCrest, PlacedNode } from "./types";

export const CREST_CLUSTER_GAP = 72;

export const ochoaCrest = {
  src: "/escudo/ochoa-escudo.png",
  alt: "Escudo de Ochoa",
  width: 200,
  height: 300,
} as const;

export function placeCrestAboveCluster(
  nodes: readonly PlacedNode[],
  spec: Pick<PlacedCrest, "id" | "width" | "height">,
): PlacedCrest | null {
  if (nodes.length === 0) {
    return null;
  }
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const minY = Math.min(...nodes.map((node) => node.y));
  return {
    id: spec.id,
    width: spec.width,
    height: spec.height,
    x: (minX + maxX) / 2 - spec.width / 2,
    y: minY - CREST_CLUSTER_GAP - spec.height,
  };
}
