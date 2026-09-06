import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { plusOrigin } from "@/domain/expand-motion";
import { expandControl } from "@/domain/graph";
import { asPersonId, NODE_HEIGHT } from "@/domain/types";
import { toggleExpand } from "@/domain/view";

const ANDRES = asPersonId("andres-martin-ochoa-erena");
const JAVIER = asPersonId("francisco-javier-ochoa-palop");
const AURORA = asPersonId("maria-aurora-erena-camacho");
const MATILDE = asPersonId("matilde-ochoa-palop");

describe("expandControl", () => {
  it("shows plus only when collapsed siblings remain", () => {
    expect(expandControl(family, ANDRES, ANDRES, [])).toBeNull();
    expect(expandControl(family, ANDRES, JAVIER, [])).toEqual({
      kind: "plus",
      side: "left",
    });
    expect(expandControl(family, ANDRES, MATILDE, [JAVIER])).toBeNull();
  });

  it("puts plus toward the side that will open", () => {
    expect(expandControl(family, ANDRES, AURORA, [])).toEqual({
      kind: "plus",
      side: "right",
    });
  });

  it("shows minus on an opened person", () => {
    expect(expandControl(family, ANDRES, JAVIER, [JAVIER])).toEqual({
      kind: "minus",
      side: "left",
    });
    expect(expandControl(family, ANDRES, AURORA, [AURORA])).toEqual({
      kind: "minus",
      side: "right",
    });
  });
});

describe("toggleExpand", () => {
  it("adds then removes the person from expandedIds", () => {
    const view = {
      focusId: ANDRES,
      selectedId: null,
      expandedIds: [] as ReturnType<typeof asPersonId>[],
      pan: { x: 0, y: 0 },
      entering: false,
      zoom: 1,
    };
    const opened = toggleExpand(view, JAVIER);
    expect(opened.expandedIds).toEqual([JAVIER]);
    expect(toggleExpand(opened, JAVIER).expandedIds).toEqual([]);
  });
});

describe("plusOrigin side", () => {
  it("sits on the opening edge of the node", () => {
    const node = {
      id: JAVIER,
      x: 10,
      y: 20,
      width: 100,
      height: NODE_HEIGHT,
      generation: -1,
    };
    expect(plusOrigin(node, "left")).toEqual({
      x: 10,
      y: 20 + NODE_HEIGHT / 2,
    });
    expect(plusOrigin(node, "right")).toEqual({
      x: 110,
      y: 20 + NODE_HEIGHT / 2,
    });
  });
});
