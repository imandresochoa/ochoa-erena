import { describe, expect, it } from "vitest";
import { connectorStroke, paintConnectors } from "@/domain/connector-paint";

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
