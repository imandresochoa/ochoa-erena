import { ochoaCrest, placeCrestAboveCluster } from "./crest";
import { placeContextNodes, placeNeblina } from "./neblina";
import {
  canvasVisible,
  childrenOf,
  parentsOf,
  siblingsOf,
  spouseEdge,
  spouseOf,
  visiblePeople,
} from "./graph";
import { vinculoLabel } from "./vinculo";
import {
  BRANCH_GUTTER,
  NODE_HEIGHT,
  NODE_PAD_X,
  PAIR_GAP,
  ROW_GAP,
  SIBLING_GAP,
  asPersonId,
  DEFAULT_FOCUS_ID,
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
    for (const child of childrenOf(graph, current)) {
      if (!visible.has(child) || gen.has(child)) {
        continue;
      }
      gen.set(child, currentGen + 1);
      queue.push(child);
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
  return { paternal: focusId };
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
  const spouse = spouseOf(graph, seed);
  if (spouse && visible.has(spouse) && !excluded.has(spouse)) {
    house.add(spouse);
  }
  return house;
}

function coupleCardWidth(
  id: PersonId,
  partner: PersonId | undefined,
  byId: Map<PersonId, Person>,
  graph: FamilyGraph,
): number {
  const person = byId.get(id);
  if (!person) {
    return 0;
  }
  let width = measureNodeWidth(person.displayName);
  if (partner && spouseEdge(graph, id, partner)) {
    const other = byId.get(partner);
    if (other) {
      width = Math.max(width, measureNodeWidth(other.displayName));
    }
  }
  return width;
}

function parentCrownWidth(
  graph: FamilyGraph,
  id: PersonId,
  house: Set<PersonId>,
  byId: Map<PersonId, Person>,
): number {
  const parents = parentsOf(graph, id).filter((parent) => house.has(parent));
  if (parents.length === 0) {
    return 0;
  }
  const packed = packSequence(parents, byId, graph, 0);
  return (
    Math.max(...packed.map((node) => node.x + node.width)) -
    Math.min(...packed.map((node) => node.x))
  );
}

function coupleGap(
  graph: FamilyGraph,
  left: PersonId,
  right: PersonId,
  house: Set<PersonId> | undefined,
  byId: Map<PersonId, Person>,
): number {
  if (!house) {
    return PAIR_GAP;
  }
  const leftCrown = parentCrownWidth(graph, left, house, byId);
  const rightCrown = parentCrownWidth(graph, right, house, byId);
  if (leftCrown === 0 || rightCrown === 0) {
    return PAIR_GAP;
  }
  const leftW = coupleCardWidth(left, right, byId, graph);
  const rightW = coupleCardWidth(right, left, byId, graph);
  const needed =
    (leftCrown || leftW) / 2 +
    SIBLING_GAP +
    (rightCrown || rightW) / 2 -
    leftW / 2 -
    rightW / 2;
  return Math.max(PAIR_GAP, needed);
}

function packSequence(
  ids: PersonId[],
  byId: Map<PersonId, Person>,
  graph: FamilyGraph,
  generation: number,
  house?: Set<PersonId>,
): PlacedNode[] {
  const placed: PlacedNode[] = [];
  let x = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const person = byId.get(id);
    if (!person) {
      continue;
    }
    const prev = placed[placed.length - 1];
    const next = ids[i + 1];
    const partner =
      prev && spouseEdge(graph, prev.id, id)
        ? prev.id
        : next && spouseEdge(graph, id, next)
          ? next
          : undefined;
    const width = coupleCardWidth(id, partner, byId, graph);
    if (prev) {
      const couple = Boolean(spouseEdge(graph, prev.id, id));
      const gap = couple
        ? coupleGap(graph, prev.id, id, house, byId)
        : SIBLING_GAP;
      x = prev.x + prev.width + gap;
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

function boundsCenter(nodes: readonly PlacedNode[]): number {
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  return (minX + maxX) / 2;
}

function parentKey(
  graph: FamilyGraph,
  id: PersonId,
  placed: Map<PersonId, PlacedNode>,
): string {
  return parentsOf(graph, id)
    .filter((parent) => placed.has(parent))
    .sort()
    .join("|");
}

function restParentKey(
  graph: FamilyGraph,
  id: PersonId,
  row: readonly PersonId[],
  placed: Map<PersonId, PlacedNode>,
): string {
  const own = parentKey(graph, id, placed);
  if (own) {
    return own;
  }
  const spouse = spouseOf(graph, id);
  return spouse && row.includes(spouse) ? parentKey(graph, spouse, placed) : "";
}

function childKey(
  graph: FamilyGraph,
  ids: readonly PersonId[],
  house: Set<PersonId>,
  placed: Map<PersonId, PlacedNode>,
): string {
  const children = new Set<PersonId>();
  for (const id of ids) {
    for (const child of childrenOf(graph, id)) {
      if (house.has(child) && placed.has(child)) {
        children.add(child);
      }
    }
  }
  return [...children].sort().join("|");
}

function resolveRow(
  placed: Map<PersonId, PlacedNode>,
  generation: number,
  graph: FamilyGraph,
): void {
  const row = [...placed.values()]
    .filter((node) => node.generation === generation)
    .sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  for (let i = 1; i < row.length; i += 1) {
    const prev = placed.get(row[i - 1].id);
    const curr = placed.get(row[i].id);
    if (!prev || !curr) {
      continue;
    }
    const gap = spouseEdge(graph, prev.id, curr.id) ? PAIR_GAP : SIBLING_GAP;
    const minX = prev.x + prev.width + gap;
    if (curr.x >= minX) {
      continue;
    }
    const dx = minX - curr.x;
    for (let j = i; j < row.length; j += 1) {
      const node = placed.get(row[j].id);
      if (node) {
        placed.set(node.id, { ...node, x: node.x + dx });
      }
    }
  }
}

function placeHouse(
  graph: FamilyGraph,
  house: Set<PersonId>,
  gens: Map<PersonId, number>,
  byId: Map<PersonId, Person>,
  focusId: PersonId,
): PlacedNode[] {
  const placed = new Map<PersonId, PlacedNode>();
  const generations = [...new Set([...house].map((id) => gens.get(id) ?? 0))].sort(
    (a, b) => b - a,
  );
  for (const generation of generations) {
    const ids = [...house].filter((id) => (gens.get(id) ?? 0) === generation);
    const ordered = rowOrder(graph, ids, focusId);
    const used = new Set<PersonId>();
    const units: PersonId[][] = [];
    for (const id of ordered) {
      if (used.has(id)) {
        continue;
      }
      const unit = [id];
      used.add(id);
      const spouse = spouseOf(graph, id);
      if (spouse && ids.includes(spouse) && !used.has(spouse)) {
        unit.push(spouse);
        used.add(spouse);
      }
      unit.sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b));
      units.push(unit);
    }
    const anchored = units
      .map((unit) => ({ unit, key: childKey(graph, unit, house, placed) }))
      .filter((item) => item.key);
    anchored.sort((a, b) => {
      const center = (key: string) => {
        const nodes = (key.split("|") as PersonId[])
          .map((id) => placed.get(id))
          .filter((node): node is PlacedNode => Boolean(node));
        return nodes.length > 0 ? boundsCenter(nodes) : 0;
      };
      return center(a.key) - center(b.key);
    });
    for (const { unit, key } of anchored) {
      const childNodes = (key.split("|") as PersonId[])
        .map((id) => placed.get(id))
        .filter((node): node is PlacedNode => Boolean(node));
      if (childNodes.length === 0) {
        continue;
      }
      const packed = packSequence(unit, byId, graph, generation, house);
      for (const node of settleInRow(
        packed,
        placed,
        generation,
        boundsCenter(childNodes),
      )) {
        placed.set(node.id, node);
      }
    }
    for (const id of ordered) {
      if (placed.has(id)) {
        continue;
      }
      const person = byId.get(id);
      if (!person) {
        continue;
      }
      const spouse = spouseOf(graph, id);
      const partnerInRow = spouse && ordered.includes(spouse) ? spouse : undefined;
      const width = coupleCardWidth(id, partnerInRow, byId, graph);
      const spouseNode = spouse ? placed.get(spouse) : undefined;
      let x = 0;
      if (spouse && spouseNode) {
        const before = ordered.indexOf(id) < ordered.indexOf(spouse);
        x = before
          ? spouseNode.x - PAIR_GAP - width
          : spouseNode.x + spouseNode.width + PAIR_GAP;
      } else {
        const idx = ordered.indexOf(id);
        let prev: PlacedNode | undefined;
        for (let i = idx - 1; i >= 0; i -= 1) {
          const node = placed.get(ordered[i]);
          if (node) {
            prev = node;
            break;
          }
        }
        let next: PlacedNode | undefined;
        for (let i = idx + 1; i < ordered.length; i += 1) {
          const node = placed.get(ordered[i]);
          if (node) {
            next = node;
            break;
          }
        }
        if (prev) {
          const gap = spouseEdge(graph, prev.id, id) ? PAIR_GAP : SIBLING_GAP;
          x = prev.x + prev.width + gap;
        } else if (next) {
          const gap = spouseEdge(graph, id, next.id) ? PAIR_GAP : SIBLING_GAP;
          x = next.x - gap - width;
        }
      }
      placed.set(id, {
        id,
        x,
        y: generation * ROW_GAP,
        width,
        height: NODE_HEIGHT,
        generation,
      });
    }
    resolveRow(placed, generation, graph);
  }
  return [...placed.values()];
}

function spouseLane(a: PlacedNode, b: PlacedNode): string {
  const left = a.x <= b.x ? a : b;
  const right = a.x <= b.x ? b : a;
  const y = left.y + left.height / 2;
  const x1 = left.x + left.width;
  const x2 = right.x;
  if (x2 - x1 >= 8 && Math.abs(left.y - right.y) < 1) {
    return `M ${x1} ${y} L ${x2} ${y}`;
  }
  return orthogonalLane(nodeCenter(left), nodeCenter(right));
}

function siblingLane(a: PlacedNode, b: PlacedNode): string {
  const left = a.x <= b.x ? a : b;
  const right = a.x <= b.x ? b : a;
  const y = Math.min(left.y, right.y) - 12;
  const from = nodeCenter(left);
  const to = nodeCenter(right);
  return `M ${from.x} ${left.y} L ${from.x} ${y} L ${to.x} ${y} L ${to.x} ${right.y}`;
}

function sharedPlacedParents(
  graph: FamilyGraph,
  a: PersonId,
  b: PersonId,
  nodeMap: Map<PersonId, PlacedNode>,
): PersonId[] {
  const parents = new Set(parentsOf(graph, a).filter((id) => nodeMap.has(id)));
  return parentsOf(graph, b).filter((id) => parents.has(id));
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

function settleInRow(
  group: PlacedNode[],
  placed: Map<PersonId, PlacedNode>,
  generation: number,
  centerX: number,
): PlacedNode[] {
  if (group.length === 0) {
    return [];
  }
  const width =
    Math.max(...group.map((node) => node.x + node.width)) -
    Math.min(...group.map((node) => node.x));
  const obstacles = [...placed.values()]
    .filter((node) => node.generation === generation)
    .sort((a, b) => a.x - b.x);
  let best = centerX;
  let bestDistance = Infinity;
  const consider = (lo: number, hi: number) => {
    if (hi - lo < width) {
      return;
    }
    const center = Math.min(Math.max(centerX, lo + width / 2), hi - width / 2);
    const distance = Math.abs(center - centerX);
    if (distance < bestDistance) {
      best = center;
      bestDistance = distance;
    }
  };
  let lo = -Infinity;
  for (const node of obstacles) {
    consider(lo, node.x - SIBLING_GAP);
    lo = Math.max(lo, node.x + node.width + SIBLING_GAP);
  }
  consider(lo, Infinity);
  return centerAlign(group, best);
}

function pinFocusOrigin(nodes: PlacedNode[], focusId: PersonId): PlacedNode[] {
  const focus = nodes.find((node) => node.id === focusId);
  if (!focus) {
    return centerAlign(nodes, 0);
  }
  return shiftNodes(nodes, -nodeCenter(focus).x);
}

export function layoutHouseCanvas(
  graph: FamilyGraph,
  focusId: PersonId,
  expandedIds: readonly PersonId[],
): PedigreeLayout {
  return layoutPedigree(
    graph,
    DEFAULT_FOCUS_ID,
    expandedIds,
    canvasVisible(graph, focusId, expandedIds),
  );
}

export function layoutPedigree(
  graph: FamilyGraph,
  focusId: PersonId,
  expandedIds: readonly PersonId[],
  visible = visiblePeople(graph, focusId, expandedIds),
): PedigreeLayout {
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

  const byId = new Map(graph.people.map((person) => [person.id, person]));
  const gutterLeft = -BRANCH_GUTTER / 2;
  const gutterRight = BRANCH_GUTTER / 2;
  const twoTrunks = Boolean(
    paternalSeed &&
      maternalSeed &&
      paternalSeed !== focusId &&
      maternalSeed !== focusId,
  );

  const placed = new Map<PersonId, PlacedNode>();
  if (twoTrunks) {
    let paternalNodes = rightAlign(
      placeHouse(graph, paternal, gens, byId, focusId),
      gutterLeft,
    );
    let maternalNodes = leftAlign(
      placeHouse(graph, maternal, gens, byId, focusId),
      gutterRight,
    );
    if (paternalNodes.length > 0 && maternalNodes.length > 0) {
      const paternalRight = Math.max(...paternalNodes.map((node) => node.x + node.width));
      const maternalLeft = Math.min(...maternalNodes.map((node) => node.x));
      const gap = maternalLeft - paternalRight;
      if (gap < BRANCH_GUTTER) {
        const extra = BRANCH_GUTTER - gap;
        paternalNodes = shiftNodes(paternalNodes, -Math.ceil(extra / 2));
        maternalNodes = shiftNodes(maternalNodes, Math.floor(extra / 2));
      }
    }
    for (const node of [...paternalNodes, ...maternalNodes]) {
      placed.set(node.id, node);
    }
  } else {
    const seed = paternalSeed ?? maternalSeed ?? focusId;
    const house = growHouse(graph, seed, visible, expandedIds, new Set());
    house.add(focusId);
    const focusSpouse = spouseOf(graph, focusId);
    if (focusSpouse && visible.has(focusSpouse)) {
      house.add(focusSpouse);
    }
    for (const child of childrenOf(graph, focusId)) {
      if (visible.has(child)) {
        house.add(child);
      }
    }
    let houseNodes = placeHouse(graph, house, gens, byId, focusId);
    const focusNode = houseNodes.find((node) => node.id === focusId);
    if (focusNode) {
      houseNodes = shiftNodes(houseNodes, -nodeCenter(focusNode).x);
    }
    for (const node of houseNodes) {
      placed.set(node.id, node);
    }
  }

  const restByGen = new Map<number, PersonId[]>();
  for (const id of visible) {
    if (placed.has(id)) {
      continue;
    }
    const generation = gens.get(id) ?? 0;
    const row = restByGen.get(generation) ?? [];
    row.push(id);
    restByGen.set(generation, row);
  }
  const restGenerations = [...restByGen.keys()].sort((a, b) => a - b);
  for (const generation of restGenerations) {
    const ids = restByGen.get(generation) ?? [];
    const ordered = rowOrder(graph, ids, focusId);
    const anchorRow = ids.includes(focusId);
    const groups = new Map<string, PersonId[]>();
    for (const id of ordered) {
      const key = anchorRow ? "" : restParentKey(graph, id, ordered, placed);
      const list = groups.get(key) ?? [];
      list.push(id);
      groups.set(key, list);
    }
    const unparented = groups.get("") ?? [];
    if (unparented.length > 0) {
      const packed = packSequence(unparented, byId, graph, generation);
      const restNodes = anchorRow ? pinFocusOrigin(packed, focusId) : centerAlign(packed, 0);
      for (const node of restNodes) {
        placed.set(node.id, node);
      }
    }
    for (const [key, groupIds] of groups) {
      if (!key) {
        continue;
      }
      const parentNodes = (key.split("|") as PersonId[])
        .map((id) => placed.get(id))
        .filter((node): node is PlacedNode => Boolean(node));
      const centerX = parentNodes.length > 0 ? boundsCenter(parentNodes) : 0;
      const packed = packSequence(groupIds, byId, graph, generation);
      for (const node of settleInRow(packed, placed, generation, centerX)) {
        placed.set(node.id, node);
      }
    }
  }

  const nodes = [...placed.values()];
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
        label: vinculoLabel(graph, "parent", parent.id, node.id),
      });
    }
  }

  for (const edge of graph.edges) {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) {
      continue;
    }
    if (edge.kind === "spouse") {
      connectors.push({
        kind: "spouse",
        certainty: edge.certainty,
        fromId: edge.from,
        toId: edge.to,
        d: spouseLane(a, b),
        label: vinculoLabel(graph, "spouse", edge.from, edge.to),
      });
      continue;
    }
    if (edge.kind !== "sibling") {
      continue;
    }
    if (sharedPlacedParents(graph, edge.from, edge.to, nodeMap).length > 0) {
      continue;
    }
    connectors.push({
      kind: "sibling",
      certainty: edge.certainty,
      fromId: edge.from,
      toId: edge.to,
      d: siblingLane(a, b),
      label: vinculoLabel(graph, "sibling", edge.from, edge.to),
    });
  }

  const ochoaSeed = asPersonId(PATERNAL_SEED);
  const ochoaTrunk =
    focusId === ochoaSeed || parentsOf(graph, focusId).includes(ochoaSeed);
  const ochoaHouse = ochoaTrunk
    ? growHouse(
        graph,
        ochoaSeed,
        visible,
        expandedIds,
        new Set(maternalSeed ? [maternalSeed] : []),
      )
    : new Set<PersonId>();
  const ochoaNodes = nodes.filter((node) => ochoaHouse.has(node.id));
  const javierNode = nodeMap.get(ochoaSeed);
  const auroraNode = maternalSeed ? nodeMap.get(maternalSeed) : undefined;
  const crestNodes =
    javierNode && auroraNode
      ? ochoaNodes.filter((node) => {
          const cx = node.x + node.width / 2;
          const javierX = javierNode.x + javierNode.width / 2;
          const auroraX = auroraNode.x + auroraNode.width / 2;
          return Math.abs(cx - javierX) <= Math.abs(cx - auroraX);
        })
      : ochoaNodes;
  const crest = placeCrestAboveCluster(crestNodes, {
    id: "ochoa",
    width: ochoaCrest.width,
    height: ochoaCrest.height,
  });

  const contextNodes = placeContextNodes(graph, nodes);
  return {
    nodes,
    connectors,
    crests: crest ? [crest] : [],
    contextNodes,
    neblina: placeNeblina(contextNodes, nodes),
  };
}
