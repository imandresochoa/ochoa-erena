import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import {
  connectorDasharray,
  connectorStroke,
  HYPOTHESIS_DASH,
  hasLargeTimeGap,
  LARGE_TIME_GAP_YEARS,
  paintConnectors,
  TEMPORAL_GAP_DASH,
} from "@/domain/connector-paint";
import { requirePerson } from "@/domain/graph";
import { asPersonId } from "@/domain/types";

describe("connector paint", () => {
  it("uses a softer hover stroke than ink", () => {
    expect(connectorStroke(false)).toBe("var(--color-line)");
    expect(connectorStroke(true)).toBe("var(--color-muted-ink)");
    expect(connectorStroke(true)).not.toBe("var(--color-ink)");
  });

  it("paints the hovered connector last", () => {
    const connectors = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(
      paintConnectors(connectors, (item) => item.id === "a").map((item) => item.id),
    ).toEqual(["b", "c", "a"]);
    expect(paintConnectors(connectors, () => false).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("large time gap", () => {
  it("sets the house threshold at 40 years", () => {
    expect(LARGE_TIME_GAP_YEARS).toBe(40);
  });

  it("is true only when both years exist and the child is at least 40 years later", () => {
    expect(hasLargeTimeGap(1900, 1940)).toBe(true);
    expect(hasLargeTimeGap(1900, 1941)).toBe(true);
    expect(hasLargeTimeGap(1900, 1939)).toBe(false);
    expect(hasLargeTimeGap(undefined, 1940)).toBe(false);
    expect(hasLargeTimeGap(1900, undefined)).toBe(false);
    expect(hasLargeTimeGap(undefined, undefined)).toBe(false);
  });
});

describe("connector dasharray", () => {
  it("keeps hypothesis dashed and distinct from the temporal gap", () => {
    expect(HYPOTHESIS_DASH).toBe("4 4");
    expect(TEMPORAL_GAP_DASH).toBe("1 3");
    expect(TEMPORAL_GAP_DASH).not.toBe(HYPOTHESIS_DASH);
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "hypothesis",
        parentBirthYear: 1900,
        childBirthYear: 1950,
      }),
    ).toBe(HYPOTHESIS_DASH);
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "hypothesis",
        parentBirthYear: 1900,
        childBirthYear: 1920,
      }),
    ).toBe(HYPOTHESIS_DASH);
  });

  it("dots a confirmed parent only when the time gap is large", () => {
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "confirmed",
        parentBirthYear: 1900,
        childBirthYear: 1940,
      }),
    ).toBe(TEMPORAL_GAP_DASH);
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "confirmed",
        parentBirthYear: 1900,
        childBirthYear: 1939,
      }),
    ).toBeUndefined();
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "confirmed",
        parentBirthYear: 1900,
      }),
    ).toBeUndefined();
  });

  it("never dots a spouse or sibling from the year gap", () => {
    expect(
      connectorDasharray({
        kind: "spouse",
        certainty: "confirmed",
        parentBirthYear: 1900,
        childBirthYear: 1950,
      }),
    ).toBeUndefined();
    expect(
      connectorDasharray({
        kind: "sibling",
        certainty: "confirmed",
        parentBirthYear: 1900,
        childBirthYear: 1950,
      }),
    ).toBeUndefined();
  });
});

describe("snapshot parent gaps", () => {
  function years(parentId: string, childId: string) {
    return {
      parentBirthYear: requirePerson(family, asPersonId(parentId)).birth?.year,
      childBirthYear: requirePerson(family, asPersonId(childId)).birth?.year,
    };
  }

  it("reads the cited snapshot years and applies the gap rule", () => {
    const martinFrancisco = years(
      "martin-ochoa-hidalgo",
      "francisco-javier-ochoa-palop",
    );
    expect(martinFrancisco).toEqual({
      parentBirthYear: 1917,
      childBirthYear: 1961,
    });
    expect(
      hasLargeTimeGap(
        martinFrancisco.parentBirthYear,
        martinFrancisco.childBirthYear,
      ),
    ).toBe(true);
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "confirmed",
        ...martinFrancisco,
      }),
    ).toBe(TEMPORAL_GAP_DASH);

    const juanLino = years("juan-jose-ochoa-de-eguiara", "lino-ochoa-antia");
    expect(juanLino).toEqual({ parentBirthYear: 1828, childBirthYear: 1877 });
    expect(hasLargeTimeGap(juanLino.parentBirthYear, juanLino.childBirthYear)).toBe(
      true,
    );

    const auroraMaria = years(
      "aurora-camacho-vinas",
      "maria-aurora-erena-camacho",
    );
    expect(auroraMaria).toEqual({ parentBirthYear: 1939, childBirthYear: 1963 });
    expect(
      hasLargeTimeGap(auroraMaria.parentBirthYear, auroraMaria.childBirthYear),
    ).toBe(false);
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "confirmed",
        ...auroraMaria,
      }),
    ).toBeUndefined();

    const nicomedesMaria = years(
      "nicomedes-andres-erena-lopez",
      "maria-aurora-erena-camacho",
    );
    expect(nicomedesMaria).toEqual({
      parentBirthYear: 1928,
      childBirthYear: 1963,
    });
    expect(
      hasLargeTimeGap(
        nicomedesMaria.parentBirthYear,
        nicomedesMaria.childBirthYear,
      ),
    ).toBe(false);

    const franciscoAndres = years(
      "francisco-javier-ochoa-palop",
      "andres-martin-ochoa-erena",
    );
    expect(franciscoAndres.parentBirthYear).toBe(1961);
    expect(franciscoAndres.childBirthYear).toBeUndefined();
    expect(
      hasLargeTimeGap(
        franciscoAndres.parentBirthYear,
        franciscoAndres.childBirthYear,
      ),
    ).toBe(false);
    expect(
      connectorDasharray({
        kind: "parent",
        certainty: "confirmed",
        ...franciscoAndres,
      }),
    ).toBeUndefined();
  });
});
