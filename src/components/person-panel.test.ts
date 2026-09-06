import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(path.join(import.meta.dirname, "person-panel.tsx"), "utf8");

describe("person panel copy layout", () => {
  it("uses one prose column: name, grado, life, summary, then lists", () => {
    const order = [
      ">{ficha.displayName}<",
      "key={grado}",
      ">{ficha.lifeProse}<",
      ">{ficha.summary}<",
      ">Fuentes<",
      ">Enlaces de interés<",
      "ficha.noticeMailto",
    ].map((marker) => panel.indexOf(marker));
    for (const at of order) {
      expect(at).toBeGreaterThan(-1);
    }
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index]).toBeGreaterThan(order[index - 1]);
    }
  });

  it("drops the Resumen field label and the joined life dump", () => {
    expect(panel).not.toContain("Resumen");
    expect(panel).not.toMatch(/lifeLine/);
    expect(panel).not.toContain(" · ");
  });

  it("does not fold HIP badges or kinship lists into the card", () => {
    expect(panel).not.toMatch(/\bHIP\b/);
    expect(panel).not.toContain("Padres");
    expect(panel).not.toContain("Hijos");
    expect(panel).not.toContain("Hermanos");
  });

  it("animates grado and life prose, and honors reduced motion", () => {
    expect(panel).toMatch(/useReducedMotion/);
    expect(panel).toMatch(/key=\{grado\}/);
    expect(panel).toMatch(/ficha\.lifeProse/);
    expect(panel).toMatch(/reduce \? \{ opacity: 0 \}/);
    expect(panel).toMatch(/reduce \? \{ opacity: 1 \}/);
    expect(panel).toMatch(/translateY\(6px\)/);
  });
});
