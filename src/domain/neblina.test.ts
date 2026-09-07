import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { pinExpandedLayout } from "@/domain/expand-motion";
import { parentsOf } from "@/domain/graph";
import { layoutHouseCanvas, layoutPedigree } from "@/domain/layout";
import {
  NEBLINA_COPY,
  NEBLINA_LEGEND_ID,
  NEBLINA_LEGEND_LABEL,
  isOchoaDeEguiaraName,
  neblinaRoots,
  placeNeblina,
  showsNeblinaCopy,
} from "@/domain/neblina";
import { asPersonId, DEFAULT_FOCUS_ID } from "@/domain/types";

const JUAN = asPersonId("juan-ochoa-de-eguiara");
const JUAN_JOSE = asPersonId("juan-jose-ochoa-de-eguiara");
const MARTIN_MARIA = asPersonId("martin-maria-ochoa-de-eguiyara-antia");
const ANDRES = asPersonId("andres-martin-ochoa-erena");
const AURORA = asPersonId("maria-aurora-erena-camacho");
const JAVIER = asPersonId("francisco-javier-ochoa-palop");

describe("neblina copy", () => {
  it("locks the España copy for the undefined Eguiara zone", () => {
    expect(NEBLINA_COPY).toBe(
      "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el sel de Egiara.",
    );
  });

  it("names the leyenda sample without turning neblina into a line style", () => {
    expect(NEBLINA_LEGEND_ID).toBe("neblina");
    expect(NEBLINA_LEGEND_LABEL).toBe("neblina");
  });
});

describe("Ochoa de Eguiara names", () => {
  it("accepts the house toponyms and rejects Erena-only names", () => {
    expect(isOchoaDeEguiaraName("Juan Ochoa de Eguiara")).toBe(true);
    expect(isOchoaDeEguiaraName("Martín María Ochoa de Eguiyara Antia")).toBe(
      true,
    );
    expect(isOchoaDeEguiaraName("Ochoa de Egiara")).toBe(true);
    expect(isOchoaDeEguiaraName("Andrés Martín Ochoa Erena")).toBe(false);
    expect(isOchoaDeEguiaraName("Antonio Erena Liébana")).toBe(false);
  });
});

describe("neblina roots", () => {
  it("marks Juan Ochoa de Eguiara as a root with no parents", () => {
    expect(parentsOf(family, JUAN)).toEqual([]);
    expect(neblinaRoots(family)).toContain(JUAN);
    expect(showsNeblinaCopy(family, JUAN)).toBe(true);
  });

  it("does not put documented descendants or Erena people in the zone", () => {
    expect(showsNeblinaCopy(family, JUAN_JOSE)).toBe(false);
    expect(showsNeblinaCopy(family, MARTIN_MARIA)).toBe(false);
    expect(showsNeblinaCopy(family, ANDRES)).toBe(false);
    expect(showsNeblinaCopy(family, AURORA)).toBe(false);
    expect(neblinaRoots(family)).not.toContain(JUAN_JOSE);
    expect(neblinaRoots(family)).not.toContain(MARTIN_MARIA);
  });

  it("does not invent people or parent edges to make a root", () => {
    const invented = asPersonId("juan-sendo-de-eguiara-1444");
    expect(family.people.some((person) => person.id === invented)).toBe(false);
    expect(neblinaRoots(family)).not.toContain(invented);
    expect(showsNeblinaCopy(family, invented)).toBe(false);
  });
});

describe("placeNeblina", () => {
  it("returns null when no root is placed", () => {
    expect(placeNeblina([], [JUAN])).toBeNull();
    expect(
      placeNeblina(
        [{ id: ANDRES, x: 0, y: 0, width: 80, height: 38, generation: 0 }],
        [JUAN],
      ),
    ).toBeNull();
  });

  it("sits above the placed roots and does not emit a connector", () => {
    const zone = placeNeblina(
      [
        { id: JUAN, x: 10, y: 200, width: 160, height: 38, generation: -6 },
        { id: ANDRES, x: 0, y: 800, width: 80, height: 38, generation: 0 },
      ],
      [JUAN],
    );
    expect(zone).not.toBeNull();
    expect(zone!.y + zone!.height).toBeLessThanOrEqual(200);
    expect(zone!.x).toBeLessThanOrEqual(10);
    expect(zone!.x + zone!.width).toBeGreaterThanOrEqual(170);
    expect(zone!.width).toBeGreaterThan(0);
    expect(zone!.height).toBeGreaterThan(0);
    expect(zone).not.toHaveProperty("d");
    expect(zone).not.toHaveProperty("fromId");
    expect(zone).not.toHaveProperty("toId");
  });
});

describe("house canvas neblina", () => {
  it("places a zone on the default house without adding connectors", () => {
    const withAndres = layoutHouseCanvas(family, DEFAULT_FOCUS_ID, []);
    const withAurora = layoutHouseCanvas(family, AURORA, []);
    const pedigree = layoutPedigree(family, DEFAULT_FOCUS_ID, []);
    expect(withAndres.nodes.some((node) => node.id === JUAN)).toBe(true);
    expect(withAndres.neblina).not.toBeNull();
    expect(withAurora.neblina).not.toBeNull();
    expect(pedigree.neblina).toEqual(withAndres.neblina);
    expect(withAndres.connectors).toHaveLength(pedigree.connectors.length);
    expect(
      withAndres.connectors.some(
        (item) =>
          /1444|sendo|siglo/i.test(`${item.fromId} ${item.toId} ${item.label}`),
      ),
    ).toBe(false);
  });

  it("shifts the zone with the expand pin the same way as the crest", () => {
    const closed = layoutPedigree(family, ANDRES, []);
    const opened = layoutPedigree(family, ANDRES, [JAVIER]);
    const pinned = pinExpandedLayout(closed, opened, JAVIER);
    const openedJavier = opened.nodes.find((node) => node.id === JAVIER);
    const pinnedJavier = pinned.nodes.find((node) => node.id === JAVIER);
    expect(opened.neblina).not.toBeNull();
    expect(pinned.neblina).not.toBeNull();
    expect(openedJavier).toBeDefined();
    expect(pinnedJavier).toBeDefined();
    const dx = pinnedJavier!.x - openedJavier!.x;
    const dy = pinnedJavier!.y - openedJavier!.y;
    expect(pinned.neblina!.x).toBe(opened.neblina!.x + dx);
    expect(pinned.neblina!.y).toBe(opened.neblina!.y + dy);
  });
});
