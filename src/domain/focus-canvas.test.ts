import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import {
  canvasVisible,
  expansionsToReveal,
  visiblePeople,
} from "@/domain/graph";
import { layoutHouseCanvas } from "@/domain/layout";
import {
  asPersonId,
  DEFAULT_FOCUS_ID,
  NODE_HEIGHT,
  type PersonId,
} from "@/domain/types";
import { focusPerson, framePerson, type TreeView } from "@/domain/view";

const ANDRES = DEFAULT_FOCUS_ID;
const JAVIER = asPersonId("francisco-javier-ochoa-palop");
const AURORA = asPersonId("maria-aurora-erena-camacho");
const MATILDE = asPersonId("matilde-ochoa-palop");
const MERCEDES = asPersonId("mercedes-ochoa-erena");
const DARIO = asPersonId("dario-de-dios-ochoa");
const JOSE = asPersonId("jose-ochoa-hidalgo");
const MARTIN = asPersonId("martin-ochoa-hidalgo");
const ANTONIO_ERENA = asPersonId("antonio-erena-liebana");

function andresView(expandedIds: PersonId[] = []): TreeView {
  return {
    focusId: ANDRES,
    selectedId: null,
    expandedIds,
    pan: { x: 0, y: 0 },
    entering: false,
    zoom: 1,
  };
}

function idsOf(nodes: { id: PersonId }[]): Set<PersonId> {
  return new Set(nodes.map((node) => node.id));
}

describe("expansionsToReveal", () => {
  it("is empty for people already on the default spine", () => {
    expect(expansionsToReveal(family, ANDRES)).toEqual([]);
    expect(expansionsToReveal(family, AURORA)).toEqual([]);
    expect(expansionsToReveal(family, JAVIER)).toEqual([]);
  });

  it("names the spine sibling that reveals a hidden person", () => {
    expect(expansionsToReveal(family, MATILDE)).toEqual([JAVIER]);
    expect(expansionsToReveal(family, MERCEDES)).toEqual([ANDRES]);
    expect(expansionsToReveal(family, JOSE)).toEqual([MARTIN]);
  });
});

describe("canvasVisible", () => {
  it("matches the Andrés house when Andrés is focus and nothing is expanded", () => {
    const house = visiblePeople(family, ANDRES, []);
    const canvas = canvasVisible(family, ANDRES, []);
    expect([...canvas].sort()).toEqual([...house].sort());
    expect(canvas.has(MATILDE)).toBe(false);
  });

  it("still hides Matilde until Francisco is expanded", () => {
    expect(canvasVisible(family, ANDRES, []).has(MATILDE)).toBe(false);
    expect(canvasVisible(family, ANDRES, [JAVIER]).has(MATILDE)).toBe(true);
  });

  it("keeps the house and adds Mercedes plus Darío when Mercedes is focus", () => {
    const house = canvasVisible(family, ANDRES, []);
    const canvas = canvasVisible(family, MERCEDES, [ANDRES]);
    expect(canvas.has(MERCEDES)).toBe(true);
    expect(canvas.has(DARIO)).toBe(true);
    expect(canvas.has(ANDRES)).toBe(true);
    expect(canvas.has(JAVIER)).toBe(true);
    expect(canvas.has(AURORA)).toBe(true);
    for (const id of house) {
      expect(canvas.has(id), id).toBe(true);
    }
  });
});

describe("focus does not clip the house canvas", () => {
  it("keeps every default-house person when focus moves to Javier, Aurora, or Matilde", () => {
    const house = idsOf(layoutHouseCanvas(family, ANDRES, []).nodes);
    expect(house.size).toBeGreaterThan(0);
    for (const focus of [JAVIER, AURORA, MATILDE]) {
      const next = focusPerson(andresView(), focus, family);
      const laid = idsOf(layoutHouseCanvas(family, next.focusId, next.expandedIds).nodes);
      for (const id of house) {
        expect(laid.has(id), `${focus} dropped ${id}`).toBe(true);
      }
      expect(laid.has(focus), focus).toBe(true);
    }
  });

  it("expands Francisco for Matilde and frames her without dropping Andrés or Aurora", () => {
    const next = focusPerson(andresView(), MATILDE, family);
    expect(next.expandedIds).toContain(JAVIER);
    const layout = layoutHouseCanvas(family, next.focusId, next.expandedIds);
    const laid = idsOf(layout.nodes);
    expect(laid.has(MATILDE)).toBe(true);
    expect(laid.has(ANDRES)).toBe(true);
    expect(laid.has(AURORA)).toBe(true);
    expect(laid.has(JAVIER)).toBe(true);
    expect(next.pan).toEqual(framePerson(layout, MATILDE, 1));
  });

  it("expands Andrés for Mercedes and keeps Darío on the canvas", () => {
    const next = focusPerson(andresView(), MERCEDES, family);
    expect(next.expandedIds).toContain(ANDRES);
    const laid = idsOf(layoutHouseCanvas(family, next.focusId, next.expandedIds).nodes);
    expect(laid.has(ANDRES)).toBe(true);
    expect(laid.has(AURORA)).toBe(true);
    expect(laid.has(JAVIER)).toBe(true);
    expect(laid.has(MERCEDES)).toBe(true);
    expect(laid.has(DARIO)).toBe(true);
  });

  it("frames Javier away from the origin", () => {
    const next = focusPerson(andresView(), JAVIER, family);
    const layout = layoutHouseCanvas(family, next.focusId, next.expandedIds);
    expect(next.pan).toEqual(framePerson(layout, JAVIER, 1));
    expect(next.pan).not.toEqual({ x: 0, y: 0 });
  });

  it("keeps both houses after focusing Aurora then Javier", () => {
    const afterAurora = focusPerson(andresView(), AURORA, family);
    const afterJavier = focusPerson(afterAurora, JAVIER, family);
    const laid = idsOf(
      layoutHouseCanvas(family, afterJavier.focusId, afterJavier.expandedIds).nodes,
    );
    expect(laid.has(MARTIN)).toBe(true);
    expect(laid.has(ANTONIO_ERENA)).toBe(true);
  });
});

describe("framePerson", () => {
  it("leaves Andrés at the current origin at zoom 1", () => {
    const layout = layoutHouseCanvas(family, ANDRES, []);
    expect(framePerson(layout, ANDRES, 1)).toEqual({ x: 0, y: 0 });
  });

  it("puts the target node center at the viewport origin", () => {
    const layout = layoutHouseCanvas(family, ANDRES, []);
    const node = layout.nodes.find((item) => item.id === JAVIER);
    expect(node).toBeDefined();
    const cx = node!.x + node!.width / 2;
    const cy = node!.y + node!.height / 2;
    const pan = framePerson(layout, JAVIER, 0.8);
    expect(pan.x + 0.8 * cx).toBeCloseTo(0, 5);
    expect(pan.y - NODE_HEIGHT / 2 + 0.8 * cy).toBeCloseTo(0, 5);
  });
});
