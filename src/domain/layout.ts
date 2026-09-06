import { childrenOf, parentsOf, siblingsOf, spouseEdge, spouseOf, visiblePeople } from "./graph";
import {
  NODE_HEIGHT,
  NODE_PAD_X,
  PAIR_GAP,
  ROW_GAP,
  SIBLING_GAP,
  type Connector,
  type FamilyGraph,
  type PedigreeLayout,
  type PersonId,
  type PlacedNode,
} from "./types";

export function measureNodeWidth(name: string): number {
  return NODE_PAD_X * 2 + Math.round(name.length * 8.32);
}

function ancestorsOf(graph: FamilyGraph, focusId: PersonId): Set<PersonId> {
  const out = new Set<PersonId>([focusId]);
  const queue: PersonId[] = [focusId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      break;
    }
    for (const parent of parentsOf(graph, current)) {
      if (!out.has(parent)) {
        out.add(parent);
        queue.push(parent);
      }
    }
  }
  return out;
}

function spineOf(graph: FamilyGraph, focusId: PersonId): Set<PersonId> {
  const spine = ancestorsOf(graph, focusId);
  for (const child of childrenOf(graph, focusId)) {
    spine.add(child);
  }
  const spouse = spouseOf(graph, focusId);
  if (spouse) {
    spine.add(spouse);
  }
  return spine;
}

function generationMap(
  graph: FamilyGraph,
  focusId: PersonId,
  visible: Set<PersonId>,
  expandedIds: readonly PersonId[],
): Map<PersonId, number> {
  const gen = new Map<PersonId, number>([[focusId, 0]]);
  const queue: PersonId[] = [focusId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    const currentGen = gen.get(current) ?? 0;
    for (const parent of parentsOf(graph, current)) {
      if (!visible.has(parent) || gen.has(parent)) {
        continue;
      }
      gen.set(parent, currentGen - 1);
      queue.push(parent);
    }
    const spouse = spouseOf(graph, current);
    if (spouse && visible.has(spouse) && !gen.has(spouse)) {
      gen.set(spouse, currentGen);
      queue.push(spouse);
    }
    if (current === focusId) {
      for (const child of childrenOf(graph, current)) {
        if (!visible.has(child) || gen.has(child)) {
          continue;
        }
        gen.set(child, currentGen + 1);
        queue.push(child);
      }
    }
  }
  for (const expanded of expandedIds) {
    const g = gen.get(expanded);
    if (g === undefined) {
      continue;
    }
    for (const sibling of siblingsOf(graph, expanded)) {
      if (visible.has(sibling) && !gen.has(sibling)) {
        gen.set(sibling, g);
      }
    }
  }
  for (const id of visible) {
    if (!gen.has(id)) {
      gen.set(id, 1);
    }
  }
  return gen;
}

function rowOrder(
  graph: FamilyGraph,
  ids: PersonId[],
  focusId: PersonId,
): PersonId[] {
  const remaining = new Set(ids);
  const ordered: PersonId[] = [];
  const take = (id: PersonId) => {
    if (!remaining.has(id)) {
      return;
    }
    remaining.delete(id);
    ordered.push(id);
  };

  const rowSet = new Set(ids);
  const used = new Set<PersonId>();
  const units: PersonId[][] = [];

  const visitChild = (child: PersonId) => {
    const pars = parentsOf(graph, child).filter((id) => rowSet.has(id));
    if (pars.length === 0) {
      return;
    }
    const unit: PersonId[] = [];
    for (const parent of pars) {
      if (used.has(parent)) {
        continue;
      }
      used.add(parent);
      unit.push(parent);
      const spouse = spouseOf(graph, parent);
      if (
        spouse &&
        rowSet.has(spouse) &&
        pars.includes(spouse) &&
        !used.has(spouse)
      ) {
        used.add(spouse);
        unit.push(spouse);
      }
    }
    if (unit.length > 0) {
      units.push(unit);
    }
  };

  const seen = new Set<PersonId>();
  const queue: PersonId[] = [focusId];
  while (queue.length > 0) {
    const child = queue.shift();
    if (!child || seen.has(child)) {
      continue;
    }
    seen.add(child);
    visitChild(child);
    for (const parent of parentsOf(graph, child)) {
      queue.push(parent);
    }
  }

  if (rowSet.has(focusId) && !used.has(focusId)) {
    const unit = [focusId];
    used.add(focusId);
    const spouse = spouseOf(graph, focusId);
    if (spouse && rowSet.has(spouse) && !used.has(spouse)) {
      used.add(spouse);
      unit.push(spouse);
    }
    units.unshift(unit);
  }

  for (const child of childrenOf(graph, focusId)) {
    if (!rowSet.has(child) || used.has(child)) {
      continue;
    }
    used.add(child);
    const unit = [child];
    const spouse = spouseOf(graph, child);
    if (spouse && rowSet.has(spouse) && !used.has(spouse)) {
      used.add(spouse);
      unit.push(spouse);
    }
    units.push(unit);
  }

  for (const unit of units) {
    const left = unit[0];
    const right = unit[unit.length - 1];
    const leftSibs = siblingsOf(graph, left).filter(
      (id) => remaining.has(id) && !used.has(id),
    );
    const rightSibs =
      unit.length > 1
        ? siblingsOf(graph, right).filter((id) => remaining.has(id) && !used.has(id))
        : [];
    for (const sibling of leftSibs) {
      take(sibling);
    }
    for (const id of unit) {
      take(id);
    }
    for (const sibling of rightSibs) {
      take(sibling);
    }
  }

  for (const id of [...remaining]) {
    take(id);
  }
  return ordered;
}

export function layoutPedigree(
  graph: FamilyGraph,
  focusId: PersonId,
  expandedIds: readonly PersonId[],
): PedigreeLayout {
  const visible = visiblePeople(graph, focusId, expandedIds);
  const gens = generationMap(graph, focusId, visible, expandedIds);
  const spine = spineOf(graph, focusId);
  const rows = new Map<number, PersonId[]>();
  for (const id of visible) {
    const g = gens.get(id) ?? 0;
    const row = rows.get(g) ?? [];
    row.push(id);
    rows.set(g, row);
  }
  const nodes: PlacedNode[] = [];
  const byId = new Map(graph.people.map((person) => [person.id, person]));
  for (const [generation, ids] of rows) {
    const ordered = rowOrder(graph, ids, focusId);
    let x = 0;
    const placed: PlacedNode[] = [];
    for (const id of ordered) {
      const person = byId.get(id);
      if (!person) {
        continue;
      }
      const width = measureNodeWidth(person.displayName);
      const prev = placed[placed.length - 1];
      if (prev) {
        const couple = Boolean(spouseEdge(graph, prev.id, id));
        x = prev.x + prev.width + (couple ? PAIR_GAP : SIBLING_GAP);
      }
      placed.push({
        id,
        x,
        y: generation * ROW_GAP,
        width,
        height: NODE_HEIGHT,
        generation,
      });
    }
    const anchors = placed.filter((node) => spine.has(node.id));
    const box = anchors.length > 0 ? anchors : placed;
    const minX = Math.min(...box.map((node) => node.x));
    const maxX = Math.max(...box.map((node) => node.x + node.width));
    const shift = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
    for (const node of placed) {
      nodes.push({ ...node, x: node.x - shift });
    }
  }
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const connectors: Connector[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    const pars = parentsOf(graph, node.id).filter((id) => nodeMap.has(id));
    if (pars.length === 0) {
      continue;
    }
    const parentNodes = pars
      .map((id) => nodeMap.get(id))
      .filter((item): item is PlacedNode => Boolean(item));
    const midX =
      parentNodes.reduce((sum, item) => sum + item.x + item.width / 2, 0) /
      parentNodes.length;
    const parentBottom = Math.min(...parentNodes.map((item) => item.y + item.height));
    const childTop = node.y;
    const barY = parentBottom + (childTop - parentBottom) / 2;
    for (const parent of parentNodes) {
      const key = `${parent.id}->${node.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const edge = graph.edges.find(
        (item) => item.kind === "parent" && item.from === parent.id && item.to === node.id,
      );
      const px = parent.x + parent.width / 2;
      const py = parent.y + parent.height;
      const d = `M ${px} ${py} L ${px} ${barY} L ${midX} ${barY} L ${midX} ${childTop}`;
      connectors.push({
        kind: "parent",
        certainty: edge?.certainty ?? "confirmed",
        d,
      });
    }
  }
  for (const edge of graph.edges) {
    if (edge.kind !== "spouse" && edge.kind !== "sibling") {
      continue;
    }
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) {
      continue;
    }
    const left = a.x < b.x ? a : b;
    const right = a.x < b.x ? b : a;
    const y = left.y + left.height / 2;
    connectors.push({
      kind: "spouse",
      certainty: edge.certainty,
      d: `M ${left.x + left.width} ${y} L ${right.x} ${y}`,
    });
  }
  return { nodes, connectors };
}
