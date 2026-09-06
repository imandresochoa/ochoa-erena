import { describe, expect, it } from "vitest";
import { family } from "@/data/family";
import { asPersonId } from "@/domain/types";
import { sexOfPerson, vinculoLabel } from "@/domain/vinculo";
import { requirePerson } from "@/domain/graph";

describe("vínculo labels", () => {
  it("reads sex from the given name only", () => {
    expect(sexOfPerson(requirePerson(family, asPersonId("phelipa-zufiaur-ybarreta")))).toBe(
      "f",
    );
    expect(
      sexOfPerson(requirePerson(family, asPersonId("manuel-martinez-de-albeniz-albizu"))),
    ).toBe("m");
    expect(
      sexOfPerson(requirePerson(family, asPersonId("martin-maria-ochoa-de-eguiyara-antia"))),
    ).toBe("m");
  });

  it("names the edge, not a new kinship", () => {
    expect(
      vinculoLabel(
        family,
        "parent",
        asPersonId("phelipa-zufiaur-ybarreta"),
        asPersonId("barbara-martinez-de-albeniz"),
      ),
    ).toBe("madre · hija");
    expect(
      vinculoLabel(
        family,
        "spouse",
        asPersonId("manuel-martinez-de-albeniz-albizu"),
        asPersonId("phelipa-zufiaur-ybarreta"),
      ),
    ).toBe("cónyuge");
    expect(
      vinculoLabel(
        family,
        "sibling",
        asPersonId("francisco-javier-ochoa-palop"),
        asPersonId("matilde-ochoa-palop"),
      ),
    ).toBe("hermano/a");
  });
});
