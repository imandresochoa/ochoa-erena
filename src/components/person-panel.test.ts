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
      ">Archivos<",
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

  it("does not fold HIP badges into the card", () => {
    expect(panel).not.toMatch(/\bHIP\b/);
  });

  it("lists padres, hijos, and hermanos from fichaKin after the degree line", () => {
    const gradoAt = panel.indexOf("key={grado}");
    const padresAt = panel.indexOf("{FICHA_KIN_LABELS.parents}");
    const hijosAt = panel.indexOf("{FICHA_KIN_LABELS.children}");
    const hermanosAt = panel.indexOf("{FICHA_KIN_LABELS.siblings}");
    const lifeAt = panel.indexOf(">{ficha.lifeProse}<");
    expect(padresAt).toBeGreaterThan(gradoAt);
    expect(hijosAt).toBeGreaterThan(padresAt);
    expect(hermanosAt).toBeGreaterThan(hijosAt);
    expect(lifeAt).toBeGreaterThan(hermanosAt);
    expect(panel).toMatch(/from "@\/domain\/ficha-kin"/);
  });

  it("animates grado and life prose, and honors reduced motion", () => {
    expect(panel).toMatch(/useReducedMotion/);
    expect(panel).toMatch(/key=\{grado\}/);
    expect(panel).toMatch(/ficha\.lifeProse/);
    expect(panel).toMatch(/reduce \? \{ opacity: 0 \}/);
    expect(panel).toMatch(/reduce \? \{ opacity: 1 \}/);
    expect(panel).toMatch(/translateY\(6px\)/);
  });

  it("gates Archivos on ficha.files.length", () => {
    expect(panel).toMatch(/ficha\.files\.length\s*>\s*0/);
  });

  it("maps ficha.files to blank-target noreferrer links", () => {
    const filesAt = panel.indexOf("ficha.files.map");
    const noticeAt = panel.indexOf("ficha.noticeMailto");
    expect(filesAt).toBeGreaterThan(-1);
    expect(noticeAt).toBeGreaterThan(filesAt);
    const fileRows = panel.slice(filesAt, noticeAt);
    expect(fileRows).toMatch(/href=\{file\.href\}/);
    expect(fileRows).toMatch(/\{file\.label\}/);
    expect(fileRows).toMatch(/target="_blank"/);
    expect(fileRows).toMatch(/rel="noreferrer"/);
  });

  it("animates Archivos with reduced motion like Fuentes", () => {
    const filesAt = panel.indexOf("ficha.files.length");
    const noticeAt = panel.indexOf("ficha.noticeMailto");
    expect(filesAt).toBeGreaterThan(-1);
    const archivos = panel.slice(filesAt, noticeAt);
    expect(archivos).toMatch(/motion\.div/);
    expect(archivos).toMatch(/motion\.a/);
    expect(archivos).toMatch(/reduce \? \{ opacity: 0 \}/);
    expect(archivos).toMatch(/reduce \? \{ opacity: 1 \}/);
    expect(archivos).toMatch(/translateY\(6px\)/);
  });

  it("does not invent Pulse, lorem, or fake PDF tiles in Archivos", () => {
    expect(panel).not.toMatch(/\bPulse\b/);
    expect(panel).not.toMatch(/lorem/i);
    expect(panel).not.toMatch(/\.pdf/i);
    expect(panel).not.toMatch(/Documento 1|Acta de nacimiento/i);
  });

  it("does not move Fuentes catalog URLs into Archivos", () => {
    const archivosAt = panel.indexOf(">Archivos<");
    const noticeAt = panel.indexOf("ficha.noticeMailto");
    expect(archivosAt).toBeGreaterThan(-1);
    const archivos = panel.slice(archivosAt, noticeAt);
    expect(archivos).not.toMatch(
      /pares\.mcu\.es|ahdv-geah\.org|ahus\.us\.es|bibliotecavirtualmadrid/,
    );
  });
});
