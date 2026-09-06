import { childrenOf, parentsOf, siblingsOf, spouseEdge, spouseOf, visiblePeople } from "./graph";
import {
  BRANCH_GUTTER,
  NODE_HEIGHT,
  NODE_PAD_X,
  PAIR_GAP,
  ROW_GAP,
  SIBLING_GAP,
  type Connector,
  type FamilyGraph,
  type PedigreeLayout,
  type Person,
  type PersonId,
  type PlacedNode,
  type Vec,
} from "./types";

const PATERNAL_SEED = "francisco-javier-ochoa-palop";
const MATERNAL_SEED = "maria-aurora-erena-camacho";

export function measureNodeWidth(name: string): number {
  return NODE_PAD_X * 2 + Math.round(name.length * 8.32);
}

export function nodeCenter(node: PlacedNode): Vec {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function orthogonalLane(from: Vec, to: Vec): string {
  if (from.y === to.y) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  const laneY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} L ${from.x} ${laneY} L ${to.x} ${laneY} L ${to.x} ${to.y}`;
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

function houseSeeds(
  graph: FamilyGraph,
  focusId: PersonId,
): { paternal?: PersonId; maternal?: PersonId } {
  const parents = parentsOf(graph, focusId);
  const paternal = parents.find((id) => id === PATERNAL_SEED);
  const maternal = parents.find((id) => id === MATERNAL_SEED);
  if (paternal && maternal) {
    return { paternal, maternal };
  }
  if (parents.length >= 2) {
    return { paternal: parents[0], maternal: parents[1] };
  }
  if (parents.length === 1) {
    return { paternal: parents[0] };
  }
  return {};
}

function growHouse(
  graph: FamilyGraph,
  seed: PersonId,
  visible: Set<PersonId>,
  expandedIds: readonly PersonId[],
  excluded: Set<PersonId>,
): Set<PersonId> {
  const house = new Set<PersonId>();
  const queue: PersonId[] = [seed];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || !visible.has(current) || excluded.has(current) || house.has(current)) {
      continue;
    }
    house.add(current);
    for (const parent of parentsOf(graph, current)) {
      queue.push(parent);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of house) {
      if (!expandedIds.includes(id)) {
        continue;
      }
      for (const sibling of siblingsOf(graph, id)) {
        if (visible.has(sibling) && !house.has(sibling) && !excluded.has(sibling)) {
          house.add(sibling);
          changed = true;
        }
      }
    }
  }
  return house;
}

function packSequence(
  ids: PersonId[],
  byId: Map<PersonId, Person>,
  graph: FamilyGraph,
  generation: number,
): PlacedNode[] {
  const placed: PlacedNode[] = [];
  let x = 0;
  for (const id of ids) {
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
  return placed;
}

function shiftNodes(nodes: PlacedNode[], dx: number): PlacedNode[] {
  return nodes.map((node) => ({ ...node, x: node.x + dx }));
}

function rightAlign(nodes: PlacedNode[], rightEdge: number): PlacedNode[] {
  if (nodes.length === 0) {
    return [];
  }
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  return shiftNodes(nodes, rightEdge - maxX);
}

function leftAlign(nodes: PlacedNode[], leftEdge: number): PlacedNode[] {
  if (nodes.length === 0) {
    return [];
  }
  const minX = Math.min(...nodes.map((node) => node.x));
  return shiftNodes(nodes, leftEdge - minX);
}

function centerAlign(nodes: PlacedNode[], centerX: number): PlacedNode[] {
  if (nodes.length === 0) {
    return [];
  }
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  return shiftNodes(nodes, centerX - (minX + maxX) / 2);
}

export function layoutPedigree(
  graph: FamilyGraph,
  focusId: PersonId,
  expandedIds: readonly PersonId[],
): PedigreeLayout {
  const visible = visiblePeople(graph, focusId, expandedIds);
  const gens = generationMap(graph, focusId, visible, expandedIds);
  const seeds = houseSeeds(graph, focusId);
  const maternalSeed = seeds.maternal;
  const paternalSeed = seeds.paternal;
  const paternal = paternalSeed
    ? growHouse(
        graph,
        paternalSeed,
        visible,
        expandedIds,
        new Set(maternalSeed ? [maternalSeed] : []),
      )
    : new Set<PersonId>();
  const maternal = maternalSeed
    ? growHouse(
        graph,
        maternalSeed,
        visible,
        expandedIds,
        new Set(paternalSeed ? [paternalSeed] : []),
      )
    : new Set<PersonId>();

  const rows = new Map<number, PersonId[]>();
  for (const id of visible) {
    const g = gens.get(id) ?? 0;
    const row = rows.get(g) ?? [];
    row.push(id);
    rows.set(g, row);
  }

  const nodes: PlacedNode[] = [];
  const byId = new Map(graph.people.map((person) => [person.id, person]));
  const gutterLeft = -BRANCH_GUTTER / 2;
  const gutterRight = BRANCH_GUTTER / 2;

  for (const [generation, ids] of rows) {
    const ordered = rowOrder(graph, ids, focusId);
    const paternalIds = ordered.filter((id) => paternal.has(id));
    const maternalIds = ordered.filter((id) => maternal.has(id) && !paternal.has(id));
    const restIds = ordered.filter((id) => !paternal.has(id) && !maternal.has(id));

    const paternalNodes = rightAlign(
      packSequence(paternalIds, byId, graph, generation),
      gutterLeft,
      );
    const maternalNodes = leftAlign(
      packSequence(maternalIds, byId, graph, generation),
      gutterRight,
    );
    const restNodes = centerAlign(packSequence(restIds, byId, graph, generation), 0);
    nodes.push(...paternalNodes, ...maternalNodes, ...restNodes);
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const connectors: Connector[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    for (const parentId of parentsOf(graph, node.id)) {
      const parent = nodeMap.get(parentId);
      if (!parent) {
        continue;
      }
      const key = `${parent.id}->${node.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const edge = graph.edges.find(
        (item) => item.kind === "parent" && item.from === parent.id && item.to === node.id,
      );
      connectors.push({
        kind: "parent",
        certainty: edge?.certainty ?? "confirmed",
        fromId: parent.id,
        toId: node.id,
        d: orthogonalLane(nodeCenter(parent), nodeCenter(node)),
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
    connectors.push({
      kind: "spouse",
      certainty: edge.certainty,
      fromId: edge.from,
      toId: edge.to,
      d: orthogonalLane(nodeCenter(a), nodeCenter(b)),
    });
  }

  return { nodes, connectors };
}
