import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(path.join(import.meta.dirname, rel), "utf8");
}

function crestRegion(source: string) {
  const marker = "layout.crests.map";
  const at = source.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  const close = source.indexOf("<AnimatePresence", at);
  expect(close).toBeGreaterThan(at);
  return source.slice(at, close);
}

function crestButton(source: string) {
  const region = crestRegion(source);
  const marker = "data-crest-id";
  const at = region.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  const open = region.lastIndexOf("<button", at);
  expect(open).toBeGreaterThan(-1);
  const close = region.indexOf("</button>", at);
  expect(close).toBeGreaterThan(open);
  return region.slice(open, close + "</button>".length);
}

describe("canvas crest hit target", () => {
  const canvas = read("./tree-canvas.tsx");
  const css = read("../app/globals.css");
  const region = crestRegion(canvas);

  it("renders the crest as a keyboard button", () => {
    expect(region).toMatch(/<button\b[^>]*type="button"/);
    expect(crestButton(canvas)).toContain('type="button"');
  });

  it("exposes data-crest-id from the placed crest", () => {
    expect(region).toContain("data-crest-id={crest.id}");
  });

  it("does not disable pointer events on the crest hit target", () => {
    const button = crestButton(canvas);
    expect(button).not.toMatch(/pointer-events-none/);
    expect(region).not.toMatch(/pointer-events-none/);
  });

  it("opens the crest ficha through onSelectCrest after a tap, not a pan", () => {
    expect(canvas).toMatch(/onSelectCrest/);
    const button = crestButton(canvas);
    expect(button).toMatch(/panned\.current/);
    expect(button).toMatch(/onSelectCrest\(crest\.id\)/);
  });

  it("uses crest-btn active scale like ghost-btn", () => {
    expect(crestButton(canvas)).toMatch(/\bcrest-btn\b/);
    expect(css).toMatch(/\.crest-btn:active\s*\{[^}]*transform:\s*scale\(0\.97\)/);
    expect(css).toMatch(/\.ghost-btn:active\s*\{[^}]*transform:\s*scale\(0\.97\)/);
  });

  it("keeps the ES Spain alt and names the crest ficha in aria-label", () => {
    expect(region).toMatch(/alt=\{ochoaCrest\.alt\}/);
    expect(crestButton(canvas)).toContain(
      'aria-label="Abrir la ficha del escudo Ochoa de Eguiara"',
    );
  });
});
