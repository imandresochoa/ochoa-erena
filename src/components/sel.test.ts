import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEL_LEAD_EMPHASIS, SEL_SUMMARY } from "@/domain/sel";

function read(rel: string) {
  return readFileSync(path.join(import.meta.dirname, rel), "utf8");
}

const canvas = read("./tree-canvas.tsx");
const contextPanel = read("./context-panel.tsx");
const legend = read("./legend-menu.tsx");
const css = read("../app/globals.css");
const paint = read("../domain/connector-paint.ts");

describe("sel node UI surfaces", () => {
  it("paints a single sel node with the caserío image and no fog band", () => {
    expect(canvas).toMatch(/layout\.contextNodes/);
    expect(canvas).toContain("Sel de Egiara");
    expect(canvas).toMatch(/data-context-id/);
    expect(canvas).toMatch(/context-label/);
    expect(canvas).toMatch(/selImage\.src/);
    expect(canvas).not.toMatch(/layout\.neblina/);
    expect(canvas).not.toMatch(/className="neblina/);
    expect(canvas).not.toMatch(/neblina-left|neblina-right/);
  });

  it("opens the sel ficha from data with the shared emphasis and history", () => {
    expect(contextPanel).toMatch(/context\.summary/);
    expect(contextPanel).toContain("SEL_LEAD_EMPHASIS");
    expect(contextPanel).not.toContain("NEBLINA");
    expect(contextPanel).toMatch(/Historia/);
    expect(contextPanel).toMatch(/Vinculaciones/);
    expect(contextPanel).toMatch(/context\.history/);
    expect(SEL_LEAD_EMPHASIS).toBe("sel de Egiara");
    expect(SEL_SUMMARY).toContain(SEL_LEAD_EMPHASIS);
  });

  it("drops the neblina from the leyenda and the stylesheet", () => {
    expect(legend).not.toMatch(/neblina|NEBLINA/i);
    expect(css).not.toMatch(/\.neblina\b/);
    expect(css).not.toMatch(/neblina-breathe|neblina-swatch/);
    expect(css).toMatch(/\.context-label\b/);
    expect(css).toMatch(/\.sel-image\b/);
  });

  it("does not invent a connector style for a s.XV ancestor", () => {
    expect(paint).not.toMatch(/1444|sendo|siglo\s*XV|neblina/i);
    expect(canvas).not.toMatch(/fromId=.*1444|toId=.*1444/);
  });
});
