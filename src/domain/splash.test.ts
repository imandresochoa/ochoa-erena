import { describe, expect, it } from "vitest";
import { connectorStroke } from "@/domain/connector-paint";
import {
  SPLASH_DRAW_S,
  SPLASH_EASE,
  SPLASH_MARK,
  SPLASH_MORPH_S,
  SPLASH_REVEAL_S,
  SPLASH_STORAGE_KEY,
  parseSplashMark,
  splashIntent,
  splashStroke,
} from "@/domain/splash";
import { WELCOME_INTRODUCTION } from "@/domain/welcome";

describe("splashIntent", () => {
  it("plays on first enter when motion is allowed", () => {
    expect(splashIntent({ reducedMotion: false, played: false })).toBe("play");
  });

  it("skips when reduced motion is on", () => {
    expect(splashIntent({ reducedMotion: true, played: false })).toBe("skip");
  });

  it("skips when already played", () => {
    expect(splashIntent({ reducedMotion: false, played: true })).toBe("skip");
  });

  it("skips when reduced motion is on and already played", () => {
    expect(splashIntent({ reducedMotion: true, played: true })).toBe("skip");
  });
});

describe("parseSplashMark", () => {
  it("reads the played mark", () => {
    expect(parseSplashMark("1")).toBe(true);
  });

  it("treats a missing mark as not played", () => {
    expect(parseSplashMark(null)).toBe(false);
  });

  it("rejects empty, zero, and yes", () => {
    expect(parseSplashMark("")).toBe(false);
    expect(parseSplashMark("0")).toBe(false);
    expect(parseSplashMark("yes")).toBe(false);
  });
});

describe("splash storage", () => {
  it("stores the played mark under the house key", () => {
    expect(SPLASH_MARK).toBe("1");
    expect(SPLASH_STORAGE_KEY).toBe("ochoa-erena:splash-played");
  });
});

describe("splashStroke", () => {
  it("paints a confirmed parent line, not ink or spouse", () => {
    expect(splashStroke()).toEqual({
      color: connectorStroke(false),
      width: 1,
      dasharray: undefined,
    });
    expect(splashStroke().color).toBe("var(--color-line)");
    expect(splashStroke().color).not.toBe("var(--color-ink)");
  });
});

describe("splash timing", () => {
  it("draws a bit longer than chrome and morphs and reveals quickly", () => {
    expect(SPLASH_DRAW_S).toBeGreaterThan(0.3);
    expect(SPLASH_DRAW_S).toBeLessThanOrEqual(0.6);
    expect(SPLASH_MORPH_S).toBeGreaterThan(0);
    expect(SPLASH_MORPH_S).toBeLessThanOrEqual(0.3);
    expect(SPLASH_REVEAL_S).toBeGreaterThan(0);
    expect(SPLASH_REVEAL_S).toBeLessThanOrEqual(0.3);
    expect(SPLASH_EASE).toEqual([0.23, 1, 0.32, 1]);
  });
});

describe("welcome", () => {
  it("keeps the house introduction", () => {
    expect(WELCOME_INTRODUCTION).toBe(
      "Las raíces de la familia Ochoa Erena se remontan a dos tierras: Álava, en el norte, y la campiña jiennense. La rama Ochoa nace en el solar de Eguiyara, entre Aspárrena y Vitoria —de donde Martín María Ochoa de Eguiyara Antia bajó a Posadas a principios del siglo XX—, y se afirma después en Jaén. La rama Erena hunde sus orígenes en Torredonjimeno y Martos, donde Antonio Erena Liébana y Dolores López Martos asentaron la línea que, unida a la Ochoa, da nombre a esta casa.",
    );
  });
});
