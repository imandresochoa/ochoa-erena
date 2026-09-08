import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function panel() {
  return readFileSync(path.join(import.meta.dirname, "escudo-panel.tsx"), "utf8");
}

describe("escudo panel copy layout", () => {
  it("uses the static Ochoa crest ficha and exact title", () => {
    const src = panel();
    expect(src).toMatch(/from "@\/domain\/escudo-ficha"/);
    expect(src).toMatch(/escudoOchoaFicha/);
    expect(src).toContain(">{escudoOchoaFicha.title}<");
    expect(src).toMatch(/El Escudo Ochoa de Eguiara|ESCUDO_OCHOA_TITLE|escudoOchoaFicha\.title/);
  });

  it("reuses person ficha chrome", () => {
    const src = panel();
    expect(src).toContain("ghost-btn ficha-back");
    expect(src).toContain("Volver");
    expect(src).toMatch(/motion\.aside/);
    expect(src).toMatch(/useReducedMotion/);
    expect(src).toMatch(/reduce \? \{ opacity: 0 \}/);
    expect(src).toMatch(/reduce \? \{ opacity: 1 \}/);
    expect(src).toMatch(/translateY\(6px\)/);
    expect(src).toMatch(/translateY\(100%\)/);
    expect(src).toMatch(/translateX\(100%\)/);
  });

  it("maps heading and paragraph blocks and titles headings", () => {
    const src = panel();
    const mapAt = src.indexOf("escudoOchoaFicha.blocks.map");
    expect(mapAt).toBeGreaterThan(-1);
    const mapped = src.slice(mapAt);
    expect(mapped).toMatch(/kind\s*===\s*["']h["']/);
    expect(mapped).toMatch(/type-title/);
  });

  it("includes the title in the sheet aria-label", () => {
    const src = panel();
    expect(src).toMatch(/aria-label/);
    const asideAt = src.indexOf("motion.aside");
    expect(asideAt).toBeGreaterThan(-1);
    const aside = src.slice(asideAt, src.indexOf("</motion.aside>", asideAt));
    expect(aside).toMatch(/escudoOchoaFicha\.title|ESCUDO_OCHOA_TITLE|El Escudo Ochoa de Eguiara/);
  });

  it("does not reuse person kin, notice, oral jargon, or invented sources", () => {
    const src = panel();
    expect(src).not.toMatch(/fichaKin/);
    expect(src).not.toMatch(/FICHA_KIN_LABELS/);
    expect(src).not.toContain("Padres");
    expect(src).not.toContain("Hijos");
    expect(src).not.toContain("Hermanos");
    expect(src).not.toMatch(/noticeMailto/);
    expect(src).not.toContain("Avisar a Andrés");
    expect(src).not.toMatch(/fuente oral/i);
    expect(src).not.toContain(">Fuentes<");
    expect(src).not.toMatch(/href=\{/);
    expect(src).not.toMatch(/from "@\/data\/family"/);
  });
});
