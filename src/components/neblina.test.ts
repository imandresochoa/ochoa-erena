import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NEBLINA_COPY, NEBLINA_LEGEND_ID } from "@/domain/neblina";

function read(rel: string) {
  return readFileSync(path.join(import.meta.dirname, rel), "utf8");
}

const canvas = read("./tree-canvas.tsx");
const panel = read("./person-panel.tsx");
const legend = read("./legend-menu.tsx");
const css = read("../app/globals.css");
const paint = read("../domain/connector-paint.ts");

describe("neblina UI surfaces", () => {
  it("paints the canvas zone with the exact copy when layout.neblina is set", () => {
    expect(canvas).toMatch(/from "@\/domain\/neblina"/);
    expect(canvas).toContain("NEBLINA_COPY");
    expect(canvas).toMatch(/layout\.neblina/);
    expect(canvas).toMatch(/className=.*neblina/);
    expect(NEBLINA_COPY).toBe(
      "Hay Ochoa de Eguiara en el siglo XV, pero las conexiones concretas no están definidas. Todo se vincula con el sel de Egiara.",
    );
  });

  it("shows the same copy on the ficha of a neblina root", () => {
    expect(panel).toMatch(/showsNeblinaCopy/);
    expect(panel).toContain("NEBLINA_COPY");
    expect(panel).toMatch(/useReducedMotion/);
  });

  it("adds neblina to the leyenda without a line-stroke sample", () => {
    expect(legend).toContain("NEBLINA_LEGEND_ID");
    expect(legend).toMatch(new RegExp(NEBLINA_LEGEND_ID));
    expect(legend).toMatch(/id === "neblina"/);
    expect(legend).not.toMatch(
      /id === "neblina"[\s\S]{0,200}border-(t )?(dotted|dashed)/,
    );
  });

  it("uses a soft haze and honors prefers-reduced-motion", () => {
    expect(css).toMatch(/\.neblina\b/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    const reduce = css.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/,
    );
    expect(reduce?.[1]).toMatch(/\.neblina\b/);
    expect(reduce?.[1]).toMatch(/animation:\s*none/);
  });

  it("does not invent a connector style for a s.XV ancestor", () => {
    expect(paint).not.toMatch(/1444|sendo|siglo\s*XV|neblina/i);
    expect(canvas).not.toMatch(/fromId=.*1444|toId=.*1444/);
  });
});
