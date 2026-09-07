import { describe, expect, it } from "vitest";
import { defaultPerson, family } from "@/data/family";
import {
  canvasVisible,
  childrenOf,
  expansionsToReveal,
  parentsOf,
  requirePerson,
  spouseOf,
  visiblePeople,
} from "@/domain/graph";
import { layoutHouseCanvas, layoutPedigree } from "@/domain/layout";
import {
  asPersonId,
  DEFAULT_FOCUS_ID,
  DEFAULT_FOCUS_NAME,
  NODE_HEIGHT,
  ROW_GAP,
  type FamilyGraph,
  type PedigreeLayout,
  type PersonId,
  type PlacedNode,
} from "@/domain/types";
import {
  focusPerson,
  framePerson,
  restoreFocusView,
  toggleExpand,
  type TreeView,
} from "@/domain/view";

const ANDRES = asPersonId("andres-martin-ochoa-erena");
const JAVIER = asPersonId("francisco-javier-ochoa-palop");
const AURORA = asPersonId("maria-aurora-erena-camacho");
const MATILDE = asPersonId("matilde-ochoa-palop");
const MERCEDES = asPersonId("mercedes-ochoa-erena");
const DARIO = asPersonId("dario-de-dios-ochoa");
const MARTIN = asPersonId("martin-ochoa-hidalgo");
const JOSE = asPersonId("jose-ochoa-hidalgo");
const ANTONIO_ERENA = asPersonId("antonio-erena-liebana");

const andresView: TreeView = {
  focusId: ANDRES,
  selectedId: null,
  expandedIds: [],
  pan: { x: 0, y: 0 },
  entering: false,
  zoom: 1,
};

function canvasLayout(expandedIds: readonly PersonId[]): PedigreeLayout {
  return layoutPedigree(family, DEFAULT_FOCUS_ID, expandedIds);
}

function ids(layout: PedigreeLayout): Set<PersonId> {
  return new Set(layout.nodes.map((node) => node.id));
}

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

function connectorKey(connector: PedigreeLayout["connectors"][number]): string {
  return `${connector.kind}:${connector.fromId}:${connector.toId}`;
}

function sortedConnectors(layout: PedigreeLayout): PedigreeLayout["connectors"] {
  return [...layout.connectors].sort((a, b) =>
    connectorKey(a).localeCompare(connectorKey(b)),
  );
}

function expectSameNodes(actual: PedigreeLayout, expected: PedigreeLayout): void {
  expect(ids(actual)).toEqual(ids(expected));
  for (const node of expected.nodes) {
    expect(nodeById(actual, node.id)).toEqual(node);
  }
}

function houseWith(
  graph: FamilyGraph,
  focusId: PersonId,
  expandedIds: readonly PersonId[],
): Set<PersonId> {
  const visible = new Set(visiblePeople(graph, DEFAULT_FOCUS_ID, expandedIds));
  for (const child of childrenOf(graph, focusId)) {
    visible.add(child);
  }
  const spouse = spouseOf(graph, focusId);
  if (spouse) {
    visible.add(spouse);
  }
  visible.add(focusId);
  return visible;
}

const house = ids(canvasLayout([]));

function expectHouseKept(layout: PedigreeLayout): void {
  const laid = ids(layout);
  for (const id of house) {
    expect(laid.has(id), `${id} dropped from the canvas`).toBe(true);
  }
}

describe("default house", () => {
  it("names Andrés as the canvas root", () => {
    expect(DEFAULT_FOCUS_ID).toBe(defaultPerson?.id);
    expect(requirePerson(family, DEFAULT_FOCUS_ID).displayName).toBe(DEFAULT_FOCUS_NAME);
    expect(house.size).toBe(45);
  });
});

describe("expansionsToReveal", () => {
  it("returns nothing for people already on the default spine", () => {
    expect(expansionsToReveal(family, ANDRES)).toEqual([]);
    expect(expansionsToReveal(family, AURORA)).toEqual([]);
    expect(expansionsToReveal(family, JAVIER)).toEqual([]);
  });

  it("opens Francisco Javier to reveal Matilde", () => {
    const reveal = expansionsToReveal(family, MATILDE);
    expect(reveal).toContain(JAVIER);
    expect(visiblePeople(family, DEFAULT_FOCUS_ID, reveal).has(MATILDE)).toBe(true);
  });

  it("opens Andrés to reveal Mercedes", () => {
    const reveal = expansionsToReveal(family, MERCEDES);
    expect(reveal).toContain(ANDRES);
    expect(visiblePeople(family, DEFAULT_FOCUS_ID, reveal).has(MERCEDES)).toBe(true);
  });

  it("opens Andrés then Mercedes to reveal Darío", () => {
    const reveal = expansionsToReveal(family, DARIO);
    expect(reveal).toContain(ANDRES);
    expect(reveal).toContain(MERCEDES);
    expect(visiblePeople(family, DEFAULT_FOCUS_ID, reveal).has(DARIO)).toBe(true);
    expect(visiblePeople(family, DEFAULT_FOCUS_ID, [ANDRES]).has(DARIO)).toBe(false);
  });

  it("opens Martín to reveal José", () => {
    const reveal = expansionsToReveal(family, JOSE);
    expect(reveal).toContain(MARTIN);
    expect(visiblePeople(family, DEFAULT_FOCUS_ID, reveal).has(JOSE)).toBe(true);
  });

  it("only opens people who are on the canvas", () => {
    for (const target of [MATILDE, MERCEDES, JOSE, DARIO]) {
      const reveal = expansionsToReveal(family, target);
      const visible = visiblePeople(family, DEFAULT_FOCUS_ID, reveal);
      expect(reveal).not.toContain(target);
      for (const id of reveal) {
        expect(visible.has(id), `${id} is not on the canvas`).toBe(true);
      }
    }
  });
});

describe("canvasVisible", () => {
  it("matches the default visible set when Andrés is the focus", () => {
    expect(canvasVisible(family, ANDRES, [])).toEqual(visiblePeople(family, ANDRES, []));
    expect(canvasVisible(family, ANDRES, [JAVIER])).toEqual(
      visiblePeople(family, ANDRES, [JAVIER]),
    );
  });

  it("adds the focused person, their children, and their spouse to the default house", () => {
    for (const focus of [JAVIER, AURORA, MATILDE, MERCEDES]) {
      for (const expanded of [[], [ANDRES], [JAVIER]]) {
        expect(canvasVisible(family, focus, expanded)).toEqual(
          houseWith(family, focus, expanded),
        );
      }
    }
  });

  it("shows Darío when Mercedes is the focus and Andrés is opened", () => {
    const visible = canvasVisible(family, MERCEDES, [ANDRES]);
    for (const id of [MERCEDES, DARIO, ANDRES, JAVIER, AURORA]) {
      expect(visible.has(id), `${id} missing`).toBe(true);
    }
  });

  it("keeps Matilde hidden until Francisco Javier is opened", () => {
    expect(canvasVisible(family, ANDRES, []).has(MATILDE)).toBe(false);
    expect(canvasVisible(family, JAVIER, []).has(MATILDE)).toBe(false);
    expect(canvasVisible(family, ANDRES, [JAVIER]).has(MATILDE)).toBe(true);
  });

  it("reaches Mercedes then Darío from Andrés by expanding the path", () => {
    expect(canvasVisible(family, ANDRES, []).has(MERCEDES)).toBe(false);
    expect(canvasVisible(family, ANDRES, []).has(DARIO)).toBe(false);
    expect(canvasVisible(family, ANDRES, [ANDRES]).has(MERCEDES)).toBe(true);
    expect(canvasVisible(family, ANDRES, [ANDRES]).has(DARIO)).toBe(false);
    const opened = canvasVisible(family, ANDRES, [ANDRES, MERCEDES]);
    expect(opened.has(MERCEDES)).toBe(true);
    expect(opened.has(DARIO)).toBe(true);
    expect(opened.has(ANDRES)).toBe(true);
  });
});

describe("layoutHouseCanvas", () => {
  it("is the default layout when Andrés is the focus", () => {
    const actual = layoutHouseCanvas(family, ANDRES, []);
    const expected = layoutPedigree(family, ANDRES, []);
    expectSameNodes(actual, expected);
    expect(sortedConnectors(actual)).toEqual(sortedConnectors(expected));
    expect(actual.crests).toEqual(expected.crests);
  });

  it("does not re-root the tree when Matilde is the focus", () => {
    const actual = layoutHouseCanvas(family, MATILDE, [JAVIER]);
    const expected = layoutPedigree(family, ANDRES, [JAVIER]);
    expectSameNodes(actual, expected);
    expect(sortedConnectors(actual)).toEqual(sortedConnectors(expected));
    expect(ids(actual).has(MATILDE)).toBe(true);
  });

  it("keeps every default house person for Javier, Aurora, and Matilde", () => {
    for (const focus of [JAVIER, AURORA, MATILDE]) {
      const layout = layoutHouseCanvas(family, focus, []);
      expectHouseKept(layout);
      expect(ids(layout).has(focus)).toBe(true);
    }
  });

  it("places Darío one row under Mercedes without dropping the house", () => {
    const layout = layoutHouseCanvas(family, ANDRES, [ANDRES, MERCEDES]);
    expectHouseKept(layout);
    const andres = nodeById(layout, ANDRES);
    const mercedes = nodeById(layout, MERCEDES);
    const dario = nodeById(layout, DARIO);
    expect(mercedes.y).toBe(andres.y);
    expect(dario.y).toBe(mercedes.y + ROW_GAP);
  });

  it("aligns a rest-row child under its one already-placed parent", () => {
    expect(parentsOf(family, DARIO)).toEqual([MERCEDES]);
    const layout = layoutHouseCanvas(family, ANDRES, [ANDRES, MERCEDES]);
    expectHouseKept(layout);
    expect(ids(layout).has(ANDRES)).toBe(true);
    expect(ids(layout).has(JAVIER)).toBe(true);
    expect(ids(layout).has(AURORA)).toBe(true);
    const andres = nodeById(layout, ANDRES);
    const mercedes = nodeById(layout, MERCEDES);
    const dario = nodeById(layout, DARIO);
    expect(dario.y).toBe(mercedes.y + ROW_GAP);
    const darioCx = nodeCenter(dario).x;
    const mercedesCx = nodeCenter(mercedes).x;
    const andresCx = nodeCenter(andres).x;
    expect(darioCx).toBeCloseTo(mercedesCx, 5);
    expect(darioCx).not.toBeCloseTo(andresCx, 5);
  });

  it("hangs Darío on a Mercedes-only parent stub for Andrés and Mercedes focus", () => {
    expect(parentsOf(family, DARIO)).toEqual([MERCEDES]);
    const cases: { focus: PersonId; expanded: PersonId[] }[] = [
      { focus: ANDRES, expanded: [ANDRES, MERCEDES] },
      { focus: MERCEDES, expanded: [ANDRES] },
      { focus: MERCEDES, expanded: [ANDRES, MERCEDES] },
    ];
    for (const { focus, expanded } of cases) {
      const layout = layoutHouseCanvas(family, focus, expanded);
      expectHouseKept(layout);
      const andres = nodeById(layout, ANDRES);
      const mercedes = nodeById(layout, MERCEDES);
      const dario = nodeById(layout, DARIO);
      expect(nodeCenter(dario).x).toBeCloseTo(nodeCenter(mercedes).x, 5);
      expect(nodeCenter(dario).x).not.toBeCloseTo(nodeCenter(andres).x, 5);
      expect(
        layout.connectors.some(
          (item) =>
            item.kind === "parent" &&
            item.fromId === ANDRES &&
            item.toId === DARIO,
        ),
      ).toBe(false);
      const edge = layout.connectors.find(
        (item) =>
          item.kind === "parent" &&
          item.fromId === MERCEDES &&
          item.toId === DARIO,
      );
      expect(edge, `missing Mercedes → Darío when focus is ${focus}`).toBeDefined();
      const tokens = (edge?.d ?? "").trim().split(/[\s,]+/).filter(Boolean);
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < tokens.length; i += 1) {
        if (tokens[i] === "M" || tokens[i] === "L") {
          points.push({ x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) });
          i += 2;
        }
      }
      expect(points.length).toBeGreaterThanOrEqual(2);
      const mercedesCx = nodeCenter(mercedes).x;
      const andresCx = nodeCenter(andres).x;
      for (const point of points) {
        expect(point.x).toBeCloseTo(mercedesCx, 5);
        expect(point.x).not.toBeCloseTo(andresCx, 5);
      }
      expect(points[0].y).toBeCloseTo(mercedes.y + mercedes.height, 5);
      expect(points[points.length - 1].y).toBeCloseTo(dario.y, 5);
    }
  });

  it("keeps the Ochoa crest when Aurora is the focus", () => {
    const layout = layoutHouseCanvas(family, AURORA, []);
    expect(layout.crests).toHaveLength(1);
    expect(layout.crests[0].id).toBe("ochoa");
  });
});

describe("framePerson", () => {
  it("leaves Andrés at the origin on the default canvas", () => {
    expect(framePerson(canvasLayout([]), ANDRES, 1)).toEqual({ x: 0, y: 0 });
  });

  it("puts the target node center at the viewport origin", () => {
    const layout = canvasLayout([]);
    const center = nodeCenter(nodeById(layout, JAVIER));
    for (const zoom of [1, 0.5]) {
      const pan = framePerson(layout, JAVIER, zoom);
      expect(pan.x + zoom * center.x).toBeCloseTo(0, 5);
      expect(pan.y - NODE_HEIGHT / 2 + zoom * center.y).toBeCloseTo(0, 5);
    }
  });

  it("follows the pan formula from the node center", () => {
    const layout = canvasLayout([]);
    const center = nodeCenter(nodeById(layout, AURORA));
    const pan = framePerson(layout, AURORA, 0.8);
    expect(pan.x).toBeCloseTo(-0.8 * center.x, 5);
    expect(pan.y).toBeCloseTo(NODE_HEIGHT / 2 - 0.8 * center.y, 5);
  });
});

describe("focusPerson keeps the house", () => {
  it("never drops the default house when focusing Javier, Aurora, or Matilde", () => {
    for (const focus of [JAVIER, AURORA, MATILDE]) {
      const next = focusPerson(andresView, focus, family);
      const laid = layoutHouseCanvas(family, next.focusId, next.expandedIds);
      expect(next.focusId).toBe(focus);
      expectHouseKept(laid);
      expect(ids(laid).has(focus)).toBe(true);
    }
  });

  it("deploys the path to hidden Matilde and keeps Andrés, Aurora, and Javier", () => {
    const next = focusPerson(andresView, MATILDE, family);
    expect(next.expandedIds).toContain(JAVIER);
    const laid = layoutHouseCanvas(family, MATILDE, next.expandedIds);
    for (const id of [MATILDE, ANDRES, AURORA, JAVIER]) {
      expect(ids(laid).has(id), `${id} missing`).toBe(true);
    }
    expect(next.pan).toEqual(framePerson(laid, MATILDE, andresView.zoom));
    expect(next.entering).toBe(false);
    expect(next.zoom).toBe(1);
  });

  it("frames the hidden person at the current zoom", () => {
    const zoomed = { ...andresView, zoom: 0.6 };
    const next = focusPerson(zoomed, MATILDE, family);
    const laid = layoutHouseCanvas(family, MATILDE, next.expandedIds);
    expect(next.zoom).toBe(0.6);
    expect(next.pan).toEqual(framePerson(laid, MATILDE, 0.6));
  });

  it("keeps existing expansions and does not duplicate an open one", () => {
    const opened = { ...andresView, expandedIds: [AURORA, JAVIER] };
    const next = focusPerson(opened, MATILDE, family);
    expect(next.expandedIds).toContain(AURORA);
    expect(next.expandedIds.filter((id) => id === JAVIER)).toHaveLength(1);
    expect(new Set(next.expandedIds).size).toBe(next.expandedIds.length);
  });

  it("leaves expansions untouched when the target is already on the canvas", () => {
    const opened = { ...andresView, expandedIds: [AURORA] };
    expect(focusPerson(opened, JAVIER, family).expandedIds).toEqual([AURORA]);
    expect(focusPerson(opened, AURORA, family).expandedIds).toEqual([AURORA]);
  });

  it("closes the ficha and keeps zoom when changing person", () => {
    const withFicha = { ...andresView, selectedId: ANDRES, zoom: 0.7 };
    const next = focusPerson(withFicha, JAVIER, family);
    expect(next.selectedId).toBeNull();
    expect(next.zoom).toBe(0.7);
    expect(next.entering).toBe(false);
  });

  it("reveals Mercedes and her son Darío without hiding the house", () => {
    const next = focusPerson(andresView, MERCEDES, family);
    expect(next.expandedIds).toContain(ANDRES);
    const visible = canvasVisible(family, MERCEDES, next.expandedIds);
    for (const id of [MERCEDES, DARIO, ANDRES, JAVIER, AURORA]) {
      expect(visible.has(id), `${id} missing`).toBe(true);
    }
    const laid = layoutHouseCanvas(family, MERCEDES, next.expandedIds);
    expectHouseKept(laid);
    expect(ids(laid).has(MERCEDES)).toBe(true);
    expect(ids(laid).has(DARIO)).toBe(true);
    expect(next.pan).toEqual(framePerson(laid, MERCEDES, andresView.zoom));
  });

  it("reaches Darío from Andrés focus by opening Mercedes", () => {
    const next = focusPerson(andresView, DARIO, family);
    expect(next.expandedIds).toContain(ANDRES);
    expect(next.expandedIds).toContain(MERCEDES);
    const laid = layoutHouseCanvas(family, ANDRES, next.expandedIds);
    expectHouseKept(laid);
    expect(ids(laid).has(MERCEDES)).toBe(true);
    expect(ids(laid).has(DARIO)).toBe(true);
    expect(next.pan).toEqual(framePerson(laid, DARIO, 1));
  });

  it("frames a parent above the origin", () => {
    const next = focusPerson(andresView, JAVIER, family);
    const laid = layoutHouseCanvas(family, JAVIER, next.expandedIds);
    expect(next.pan).toEqual(framePerson(laid, JAVIER, 1));
    expect(next.pan).not.toEqual({ x: 0, y: 0 });
  });

  it("re-focusing Andrés returns the camera to the origin and keeps the view", () => {
    const moved = {
      ...andresView,
      selectedId: JAVIER,
      expandedIds: [JAVIER],
      pan: { x: 300, y: 200 },
    };
    const next = focusPerson(moved, ANDRES, family);
    expect(next.focusId).toBe(ANDRES);
    expect(next.selectedId).toBe(JAVIER);
    expect(next.expandedIds).toEqual([JAVIER]);
    expect(next.pan).toEqual(
      framePerson(layoutHouseCanvas(family, ANDRES, [JAVIER]), ANDRES, 1),
    );
    expect(next.pan).toEqual({ x: 0, y: 0 });
  });

  it("moving focus from Aurora to Javier keeps both houses", () => {
    const first = focusPerson(andresView, AURORA, family);
    const second = focusPerson(first, JAVIER, family);
    const laid = layoutHouseCanvas(family, second.focusId, second.expandedIds);
    expect(second.focusId).toBe(JAVIER);
    expectHouseKept(laid);
    expect(ids(laid).has(MARTIN)).toBe(true);
    expect(ids(laid).has(ANTONIO_ERENA)).toBe(true);
    expect(second.pan).toEqual(framePerson(laid, JAVIER, 1));
  });

  it("keeps the house and lands on every person in the family", () => {
    for (const person of family.people) {
      const next = focusPerson(andresView, person.id, family);
      const laid = layoutHouseCanvas(family, next.focusId, next.expandedIds);
      expectHouseKept(laid);
      expect(ids(laid).has(person.id), `${person.id} missing`).toBe(true);
      expect(next.pan).toEqual(framePerson(laid, person.id, 1));
    }
  });
});

describe("restoreFocusView", () => {
  it("drops every expansion and returns to the origin for Andrés", () => {
    const dirty = {
      ...andresView,
      selectedId: JAVIER,
      expandedIds: [JAVIER, AURORA],
      pan: { x: 300, y: -200 },
    };
    const restored = restoreFocusView(dirty, family);
    expect(restored.focusId).toBe(ANDRES);
    expect(restored.selectedId).toBe(JAVIER);
    expect(restored.expandedIds).toEqual([]);
    expect(restored.pan).toEqual({ x: 0, y: 0 });
    expect(restored.zoom).toBe(1);
  });

  it("keeps Matilde on the canvas while dropping extra expansions", () => {
    const focused = focusPerson(andresView, MATILDE, family);
    const extra = toggleExpand(focused, AURORA);
    expect(extra.expandedIds).toContain(AURORA);
    const restored = restoreFocusView(extra, family);
    expect(restored.focusId).toBe(MATILDE);
    expect(restored.expandedIds).toEqual(expansionsToReveal(family, MATILDE));
    expect(restored.expandedIds).toContain(JAVIER);
    expect(restored.expandedIds).not.toContain(AURORA);
    const laid = layoutHouseCanvas(family, MATILDE, restored.expandedIds);
    expectHouseKept(laid);
    expect(ids(laid).has(MATILDE)).toBe(true);
    expect(restored.pan).toEqual(framePerson(laid, MATILDE, restored.zoom));
  });
});
