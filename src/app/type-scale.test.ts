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

const KIN_TITLES = [
  ["parents", "Padres"],
  ["children", "Hijos"],
  ["siblings", "Hermanos"],
] as const;

function kinTitleMarker(src: string, group: string, label: string) {
  const literal = `>${label}<`;
  return src.includes(literal) ? literal : `{FICHA_KIN_LABELS.${group}}`;
}

function nextTitleStart(src: string, from: number, titles: readonly string[]) {
  const found = titles.map((title) => src.indexOf(title, from)).filter((at) => at > -1);
  expect(found.length).toBeGreaterThan(0);
  return src.lastIndexOf("<", Math.min(...found));
}

describe("title type scale", () => {
  const css = read("./globals.css");
  const layout = read("./layout.tsx");
  const panel = read("../components/person-panel.tsx");
  const welcome = read("../components/welcome-screen.tsx");
  const landing = read("../components/landing-screen.tsx");

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
    expect(classOf(panel, ">Fuentes<").split(/\s+/)).toContain("type-title");
    expect(classOf(panel, ">Enlaces de interés<").split(/\s+/)).toContain("type-title");
    expect(classOf(panel, ">Archivos<").split(/\s+/)).toContain("type-title");
  });

  it("marks escudo-panel title with type-title", () => {
    const escudo = read("../components/escudo-panel.tsx");
    expect(classOf(escudo, ">{escudoOchoaFicha.title}<").split(/\s+/)).toContain(
      "type-title",
    );
  });

  it("renders life prose as body copy, not a title dump", () => {
    expect(panel).not.toMatch(/lifeLine/);
    expect(panel).not.toContain("Resumen");
    const lifeClass = classOf(panel, ">{ficha.lifeProse}<");
    expect(lifeClass.length).toBeGreaterThan(0);
    expect(lifeClass.split(/\s+/)).not.toContain("type-title");
  });

  it("keeps the kinship degree line before life prose and summary", () => {
    const gradoAt = panel.indexOf("key={grado}");
    const lifeAt = panel.indexOf(">{ficha.lifeProse}<");
    const summaryAt = panel.indexOf(">{ficha.summary}<");
    expect(gradoAt).toBeGreaterThan(-1);
    expect(lifeAt).toBeGreaterThan(gradoAt);
    expect(summaryAt).toBeGreaterThan(lifeAt);
  });

  it("marks welcome and landing page titles with type-title", () => {
    expect(classOf(welcome, "{WELCOME_TITLE}").split(/\s+/)).toContain("type-title");
    expect(classOf(landing, "{WELCOME_TITLE}").split(/\s+/)).toContain("type-title");
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
      panel.indexOf("ficha.files.length"),
    );
    expect(leftoverRows.length).toBeGreaterThan(0);
    expect(leftoverRows).not.toMatch(/\btype-title\b/);
    const sourceRows = panel.slice(
      panel.indexOf("ficha.sources.map"),
      panel.indexOf("leftover.length"),
    );
    expect(sourceRows.length).toBeGreaterThan(0);
    expect(sourceRows).not.toMatch(/\btype-title\b/);
    const filesAt = panel.indexOf("ficha.files.map");
    expect(filesAt).toBeGreaterThan(-1);
    const fileRows = panel.slice(filesAt, panel.indexOf("ficha.noticeMailto"));
    expect(fileRows.length).toBeGreaterThan(0);
    expect(fileRows).not.toMatch(/\btype-title\b/);
  });

  it("places Archivos after leftover links and before the notice", () => {
    const enlacesAt = panel.indexOf(">Enlaces de interés<");
    const archivosAt = panel.indexOf(">Archivos<");
    const noticeAt = panel.indexOf("ficha.noticeMailto");
    expect(enlacesAt).toBeGreaterThan(-1);
    expect(archivosAt).toBeGreaterThan(enlacesAt);
    expect(noticeAt).toBeGreaterThan(archivosAt);
  });

  it("marks person-panel kin titles Padres, Hijos, and Hermanos with type-title", () => {
    const imports = (panel.match(/^import .*$/gm) ?? []).join("\n");
    expect(imports).toMatch(/from "@\/domain\/ficha-kin"/);
    for (const [group, label] of KIN_TITLES) {
      const marker = kinTitleMarker(panel, group, label);
      expect(panel.indexOf(marker)).toBeGreaterThan(-1);
      expect(classOf(panel, marker).split(/\s+/)).toContain("type-title");
    }
  });

  it("places the kin lists after the header and before Fuentes", () => {
    const header = panel.indexOf("key={grado}");
    const fuentes = panel.indexOf(">Fuentes<");
    const [padres, hijos, hermanos] = KIN_TITLES.map(([group, label]) =>
      panel.indexOf(kinTitleMarker(panel, group, label)),
    );
    expect(padres).toBeGreaterThan(header);
    expect(hijos).toBeGreaterThan(padres);
    expect(hermanos).toBeGreaterThan(hijos);
    expect(hermanos).toBeLessThan(fuentes);
  });

  it("does not mark person-panel kin name rows as title", () => {
    const markers = KIN_TITLES.map(([group, label]) => kinTitleMarker(panel, group, label));
    const nextTitles = [[markers[1]], [markers[2]], [">Fuentes<"]];
    for (const [index, marker] of markers.entries()) {
      const at = panel.indexOf(marker);
      expect(at).toBeGreaterThan(-1);
      const from = at + marker.length;
      const rows = panel.slice(from, nextTitleStart(panel, from, nextTitles[index]));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows).not.toMatch(/\btype-title\b/);
    }
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
