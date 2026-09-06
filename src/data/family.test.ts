import { describe, expect, it } from "vitest";
import { family, defaultPerson } from "@/data/family";
import { DEFAULT_FOCUS_NAME } from "@/domain/types";
import { findExactName, suggestPeople } from "@/domain/search";
import { siblingsOf, visiblePeople } from "@/domain/graph";
import { layoutPedigree } from "@/domain/layout";
import { asPersonId } from "@/domain/types";

describe("family snapshot", () => {
  it("loads Andrés as the default focus", () => {
    expect(defaultPerson?.displayName).toBe(DEFAULT_FOCUS_NAME);
    expect(findExactName(family.people, "andres martin ochoa erena")?.id).toBe(
      defaultPerson?.id,
    );
  });

  it("does not invent Mercedes as a sibling of Andrés", () => {
    expect(siblingsOf(family, asPersonId("andres-martin-ochoa-erena"))).toEqual([]);
  });

  it("plus on Francisco reveals Matilde", () => {
    const andres = asPersonId("andres-martin-ochoa-erena");
    const francisco = asPersonId("francisco-javier-ochoa-palop");
    const matilde = asPersonId("matilde-ochoa-palop");
    expect(siblingsOf(family, francisco)).toContain(matilde);
    expect(visiblePeople(family, andres, []).has(matilde)).toBe(false);
    expect(visiblePeople(family, andres, [francisco]).has(matilde)).toBe(true);
    const layout = layoutPedigree(family, andres, [francisco]);
    expect(layout.nodes.some((node) => node.id === matilde)).toBe(true);
  });

  it("predicts accent-folded names from the snapshot", () => {
    const hits = suggestPeople(family.people, "maria aurora");
    expect(hits.some((person) => person.id === "maria-aurora-erena-camacho")).toBe(
      true,
    );
  });

  it("keeps José Ochoa Hidalgo as a hypothesis sibling", () => {
    const edge = family.edges.find(
      (item) =>
        item.kind === "sibling" &&
        (item.from === "jose-ochoa-hidalgo" || item.to === "jose-ochoa-hidalgo"),
    );
    expect(edge?.certainty).toBe("hypothesis");
  });
});
