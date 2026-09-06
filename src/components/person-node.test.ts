import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(path.join(import.meta.dirname, rel), "utf8");
}

function plusButton(source: string) {
  const marker = 'data-expand="true"';
  const at = source.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  const open = source.lastIndexOf("<button", at);
  expect(open).toBeGreaterThan(-1);
  const close = source.indexOf("</button>", at);
  expect(close).toBeGreaterThan(open);
  return source.slice(open, close + "</button>".length);
}

function mediaBlocks(css: string) {
  const blocks: { condition: string; body: string }[] = [];
  const re = /@media\s+([^{]+)\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;
    while (index < css.length && depth > 0) {
      if (css[index] === "{") {
        depth += 1;
      } else if (css[index] === "}") {
        depth -= 1;
      }
      index += 1;
    }
    blocks.push({
      condition: match[1].replace(/\s+/g, " ").trim(),
      body: css.slice(start, index - 1),
    });
  }
  return blocks;
}

function cssRules(chunk: string) {
  const rules: { selector: string; body: string }[] = [];
  const re = /([^{}@]+)\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk))) {
    const start = match.index + match[0].length;
    const end = chunk.indexOf("}", start);
    if (end === -1) {
      break;
    }
    rules.push({
      selector: match[1].replace(/\s+/g, " ").trim(),
      body: chunk.slice(start, end),
    });
    re.lastIndex = end + 1;
  }
  return rules;
}

function selectorParts(selector: string) {
  return selector.split(",").map((part) => part.trim()).filter(Boolean);
}

function requiresDataOnTrue(selectorPart: string) {
  const withoutNot = selectorPart.replace(/:not\([^)]*\)/g, "");
  return /\[data-on\s*=\s*["']true["']\]/.test(withoutNot);
}

function targetsNodePlus(selectorPart: string) {
  return /\.node-plus\b/.test(selectorPart);
}

function paintsVisible(body: string) {
  return /opacity:\s*1\b/.test(body) && /pointer-events:\s*auto\b/.test(body);
}

function revealsOnHover(body: string) {
  const visible = /opacity:\s*1\b/.test(body) || /animation:/.test(body);
  return visible && /pointer-events:\s*auto\b/.test(body);
}

function topLevelNodePlusRule(css: string) {
  const stripped = css.replace(/@media[^{]+\{[\s\S]*?\n\}/g, "");
  const match = stripped.match(/(?:^|\n)\.node-plus\s*\{([^}]*)\}/);
  return match?.[1] ?? "";
}

describe("expand plus chrome", () => {
  const node = read("./person-node.tsx");
  const css = read("../app/globals.css");
  const plus = plusButton(node);

  it("does not hardcode data-on true on the expand plus", () => {
    expect(plus).not.toMatch(/data-on\s*=\s*["']true["']/);
    expect(plus).not.toMatch(/data-on\s*=\s*\{\s*["']true["']\s*\}/);
    const dataOn = plus.match(/data-on\s*=\s*\{([^}]+)\}/);
    if (dataOn) {
      expect(dataOn[1]).toMatch(/coarsePointer/);
      expect(dataOn[1]).not.toMatch(/\bselected\b/);
    }
  });

  it("hides .node-plus by default", () => {
    const rule = topLevelNodePlusRule(css);
    expect(rule).toMatch(/opacity:\s*0\b/);
    expect(rule).toMatch(/pointer-events:\s*none\b/);
  });

  it("reveals .node-plus on hover for fine pointers without data-on", () => {
    const fine = mediaBlocks(css).find(
      (block) =>
        /\(hover:\s*hover\)/.test(block.condition) &&
        /\(pointer:\s*fine\)/.test(block.condition),
    );
    expect(fine).toBeTruthy();
    const hoverRules = cssRules(fine?.body ?? "").filter((rule) =>
      selectorParts(rule.selector).some(
        (part) =>
          /person-node:hover/.test(part) &&
          targetsNodePlus(part) &&
          !requiresDataOnTrue(part),
      ),
    );
    expect(hoverRules.length).toBeGreaterThan(0);
    expect(hoverRules.some((rule) => revealsOnHover(rule.body))).toBe(true);
  });

  it("paints .node-plus under hover none or pointer coarse without data-on", () => {
    const painted = mediaBlocks(css).filter((block) =>
      cssRules(block.body).some(
        (rule) =>
          selectorParts(rule.selector).some(
            (part) => targetsNodePlus(part) && !requiresDataOnTrue(part),
          ) && paintsVisible(rule.body),
      ),
    );
    expect(painted.length).toBeGreaterThan(0);
    for (const block of painted) {
      expect(block.condition).toMatch(/\(hover:\s*none\)|\(pointer:\s*coarse\)/);
      expect(block.condition).not.toMatch(/max-width/);
    }
  });

  it("renders the plus button only when expand is truthy", () => {
    expect(node).toMatch(
      /\{expand\s*\?\s*\([\s\S]*data-expand="true"[\s\S]*\)\s*:\s*null\}/,
    );
    expect(plus).toContain('data-expand="true"');
  });

  it("places the plus toward expand.side with left-full and right-full", () => {
    expect(plus).toContain("data-side={expand.side}");
    expect(plus).toMatch(/expand\.side\s*===\s*["']right["']/);
    expect(plus).toContain("left-full");
    expect(plus).toContain("right-full");
  });

  it("does not restore plusOnSelect", () => {
    expect(node).not.toContain("plusOnSelect");
  });
});
