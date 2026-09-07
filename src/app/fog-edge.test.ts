import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(import.meta.dirname, "./globals.css"), "utf8");
const canvas = readFileSync(
  path.join(import.meta.dirname, "../components/tree-canvas.tsx"),
  "utf8",
);

function mediaBlocks(src: string) {
  const blocks: { query: string; body: string }[] = [];
  const startRe = /@media\s*([^{]+)\{/g;
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(src))) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;
    while (index < src.length && depth > 0) {
      if (src[index] === "{") depth += 1;
      else if (src[index] === "}") depth -= 1;
      index += 1;
    }
    blocks.push({ query: match[1].trim(), body: src.slice(start, index - 1) });
  }
  return blocks;
}

function ruleBody(src: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = src.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? "";
}

function shadowExtent(decl: string) {
  if (!decl || /box-shadow:\s*none\b/.test(decl)) return 0;
  const px = [...decl.matchAll(/(\d+(?:\.\d+)?)px/g)].map((item) => Number(item[1]));
  return px.length ? Math.max(...px) : 0;
}

function keyframeTo(src: string, name: string) {
  const match = src.match(
    new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
  );
  const body = match?.[1] ?? "";
  const to = body.match(/to\s*\{([^}]*)\}/);
  return to?.[1] ?? "";
}

describe("viewport edge fog chrome", () => {
  it("paints fog-edge as a viewport overlay, not the Sel band", () => {
    expect(canvas).toMatch(/className="fog-edge"/);
    expect(canvas).toMatch(/className="neblina pointer-events-none/);
  });

  it("keeps the desktop inset at 80px", () => {
    const desktop = ruleBody(css, ".fog-edge");
    expect(desktop).toMatch(/box-shadow:\s*inset 0 0 80px 80px/);
  });

  it("caps mobile edge fog at 8px after enter", () => {
    const mobile = mediaBlocks(css).find(
      (block) =>
        /max-width/.test(block.query) &&
        !/hover:|pointer:/.test(block.query) &&
        /\.fog-edge\b/.test(block.body),
    );
    expect(mobile, "mobile max-width rule for .fog-edge").toBeTruthy();
    expect(shadowExtent(ruleBody(mobile!.body, ".fog-edge"))).toBeLessThanOrEqual(8);

    const entering = ruleBody(mobile!.body, '.fog-edge[data-entering="true"]');
    expect(entering.length).toBeGreaterThan(0);
    const animation = entering.match(/animation:\s*([^;]+)/)?.[1] ?? "";
    if (/none/.test(animation)) {
      expect(shadowExtent(ruleBody(mobile!.body, ".fog-edge"))).toBeLessThanOrEqual(8);
      return;
    }
    const name = animation.trim().split(/\s+/)[0];
    expect(name.length).toBeGreaterThan(0);
    expect(shadowExtent(keyframeTo(css, name))).toBeLessThanOrEqual(8);
  });

  it("leaves the neblina Sel band intact", () => {
    expect(css).toMatch(/\.neblina\b/);
    expect(css).toMatch(/\.neblina-left\b/);
    expect(css).toMatch(/\.neblina-right\b/);
    expect(css).toMatch(/neblina-breathe\s+4s/);
    expect(css).toMatch(/linear-gradient\(\s*to bottom/);
    expect(css).toMatch(/mask-image:\s*linear-gradient/);
  });
});
