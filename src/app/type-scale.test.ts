import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(path.join(import.meta.dirname, rel), "utf8");
}

function classOf(src: string, marker: string) {
  const at = src.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  const start = src.lastIndexOf("<", at);
  expect(start).toBeGreaterThan(-1);
  const chunk = src.slice(start);
  const quoted = chunk.match(/^<[\s\S]*?className="([^"]*)"/);
  if (quoted) {
    return quoted[1];
  }
  const tmpl = chunk.match(/^<[\s\S]*?className=\{`([^`]*)`\}/);
  return tmpl?.[1] ?? "";
}

describe("title type scale", () => {
  const css = read("./globals.css");
  const layout = read("./layout.tsx");
  const panel = read("../components/person-panel.tsx");
  const welcome = read("../components/welcome-screen.tsx");
  const landing = read("../components/landing-screen.tsx");
  const pageTitle = "Árbol genealógico de la familia Ochoa Erena";

  it("defines --font-weight-title 450 and a shared .type-title class", () => {
    expect(css).toMatch(/--font-weight-title:\s*450\b/);
    expect(css).toMatch(
      /\.type-title\s*\{[^}]*font-weight:\s*var\(--font-weight-title\)/,
    );
  });

  it("keeps body at font-weight 400", () => {
    expect(css).toMatch(/(?:^|\n)body\s*\{[^}]*font-weight:\s*400\b/);
  });

  it("loads Inter as a variable face", () => {
    expect(layout).toMatch(/Inter\(\{/);
    expect(layout).not.toMatch(/Inter\(\{[^}]*weight:\s*["']400["']/);
  });

  it("loads Satoshi as satoshi@1", () => {
    expect(layout).toMatch(/f\[\]=satoshi@1&/);
    expect(layout).not.toMatch(/satoshi@400/);
  });

  it("marks person-panel titles with type-title", () => {
    expect(classOf(panel, ">{ficha.displayName}<").split(/\s+/)).toContain("type-title");
    expect(classOf(panel, "key={grado}").split(/\s+/)).toContain("type-title");
    expect(classOf(panel, ">{ficha.lifeLine}<").split(/\s+/)).toContain("type-title");
    expect(classOf(panel, ">Resumen<").split(/\s+/)).toContain("type-title");
    expect(classOf(panel, ">Fuentes<").split(/\s+/)).toContain("type-title");
    expect(classOf(panel, ">Enlaces de interés<").split(/\s+/)).toContain("type-title");
  });

  it("marks welcome and landing page titles with type-title", () => {
    expect(classOf(welcome, pageTitle).split(/\s+/)).toContain("type-title");
    expect(classOf(landing, pageTitle).split(/\s+/)).toContain("type-title");
  });

  it("uses the title token on .vinculo-tip", () => {
    const rule = css.match(/\.vinculo-tip\s*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/font-weight:\s*var\(--font-weight-title\)/);
  });

  it("does not mark person-panel summary or link rows as title", () => {
    const summaryClass = classOf(panel, ">{ficha.summary}<");
    expect(summaryClass.length).toBeGreaterThan(0);
    expect(summaryClass.split(/\s+/)).not.toContain("type-title");
    const leftoverRows = panel.slice(
      panel.indexOf("leftover.map"),
      panel.indexOf("ficha.noticeMailto"),
    );
    expect(leftoverRows.length).toBeGreaterThan(0);
    expect(leftoverRows).not.toMatch(/\btype-title\b/);
    const sourceRows = panel.slice(
      panel.indexOf("ficha.sources.map"),
      panel.indexOf("leftover.length"),
    );
    expect(sourceRows.length).toBeGreaterThan(0);
    expect(sourceRows).not.toMatch(/\btype-title\b/);
  });

  it("does not mark welcome introduction as title", () => {
    const introClass = classOf(welcome, "{WELCOME_INTRODUCTION}");
    expect(introClass.length).toBeGreaterThan(0);
    expect(introClass.split(/\s+/)).not.toContain("type-title");
  });

  it("does not mark landing input or error text as title", () => {
    const inputClass = classOf(landing, 'aria-label="Nombre"');
    expect(inputClass.length).toBeGreaterThan(0);
    expect(inputClass.split(/\s+/)).not.toContain("type-title");
    const errorClass = classOf(landing, "{error}");
    expect(errorClass.length).toBeGreaterThan(0);
    expect(errorClass.split(/\s+/)).not.toContain("type-title");
  });
});
